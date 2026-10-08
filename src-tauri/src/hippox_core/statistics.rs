//! Global LLM usage statistics ledger.
//!
//! This module owns the message-level token accounting for every
//! Hippox-backed LLM call in the app. Records are appended from three
//! sources:
//!   - Chat:          any chat subsystem routed through
//!                    `cmd_send_chat_message_async`
//!   - ScheduledTask: user-defined cron tasks executed by
//!                    `ScheduledTaskExecutor::execute`
//!   - Generate3D:    the 3D scene generator in
//!                    `subsystem::generate_3d::process_generate_3d_task`
//!
//! # Keying
//! Each LLM call produces exactly one record, keyed by
//! `(task_id, role)`. `task_id` is the hippox core task id returned by
//! `Hippox::submit`, guaranteed globally unique.
//!
//! # Subsystem attribution
//! Records produced by the chat pipeline carry a `subsystem` identifier
//! (General / Finance / Map / CodeEditor / Video / SandBox3D / BlockChain
//! / ImageEditor / PixelEditor / DataBaseClient / DockerClient / ApiClient)
//! so per-subsystem statistics can be derived from a single ledger.
//!
//! # Submit-time snapshot
//! The provider and model of the default LLM instance are captured the
//! moment `Hippox::submit` returns (i.e. before the user can switch
//! instances). A "pending" llm record is created immediately with those
//! values, and later patched with the final content and token counts once
//! `wait_task` completes.
//!
//! # Storage layout
//! Each subsystem owns its own ledger file:
//!   - General:        `{General history dir}/statistics.json`
//!   - Finance:        `{Finance history dir}/statistics.json`
//!   - Map:            `{Map history dir}/statistics.json`
//!   - CodeEditor:     `{CodeEditor history dir}/statistics.json`
//!   - Video:          `{Video history dir}/statistics.json`
//!   - SandBox3D:      `{SandBox3D history dir}/statistics.json`
//!   - BlockChain:     `{BlockChain history dir}/statistics.json`
//!   - ImageEditor:    `{ImageEditor history dir}/statistics.json`
//!   - PixelEditor:    `{PixelEditor history dir}/statistics.json`
//!   - DataBaseClient: `{DataBaseClient history dir}/statistics.json`
//!   - DockerClient:   `{DockerClient history dir}/statistics.json`
//!   - ApiClient:      `{ApiClient history dir}/statistics.json`
//!
//! ```json
//! {
//!   "version": 1,
//!   "total_input_tokens": 0,
//!   "total_output_tokens": 0,
//!   "total_task_count": 0,
//!   "records": [ { "task_id", "session_id", "subsystem", "role", ... }, ... ]
//! }
//! ```
//!
//! # Persistence model
//! Memory is the source of truth. Appends only touch the in-memory ledger
//! and mark the owning subsystem dirty; a background worker flushes every
//! dirty subsystem to its own file every 500ms.
use crate::commands::{
    get_blockchain_history_statistics, get_codeeditor_history_statistics, get_finance_history_statistics, get_general_history_statistics,
    get_map_history_statistics, get_sandbox3d_history_statistics, get_video_editing_system_history_statistics,
};
use crate::commons::FileUtils;
use crate::subsystem::{SubSystemEnum, get_apiclient_history_statistics, get_databaseclient_history_statistics, get_dockerclient_history_statistics, get_imageeditor_history_statistics, get_pixeleditor_history_statistics};
use once_cell::sync::OnceCell;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::command;
use tokio::sync::mpsc;
use tokio::time;
/// Flush interval for the statistics ledger (milliseconds).
///
/// Statistics are not on the critical path, so a longer window is fine.
const FLUSH_INTERVAL_MILLIS: u64 = 500;
/// Returns the current UNIX timestamp in milliseconds.
fn now_millis() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}
/// Resolve the on-disk statistics file for a given subsystem.
///
/// Every subsystem owns a separate `statistics.json` under its history
/// directory. `ScheduledTask` / `Generate3D` records default to
/// `SubSystemEnum::General`, so they are stored under the General history
/// directory as well.
fn statistics_path_for(subsystem: SubSystemEnum) -> PathBuf {
    match subsystem {
        SubSystemEnum::General => get_general_history_statistics(),
        SubSystemEnum::Finance => get_finance_history_statistics(),
        SubSystemEnum::Map => get_map_history_statistics(),
        SubSystemEnum::CodeEditor => get_codeeditor_history_statistics(),
        SubSystemEnum::Video => get_video_editing_system_history_statistics(),
        SubSystemEnum::SandBox3D => get_sandbox3d_history_statistics(),
        SubSystemEnum::BlockChain => get_blockchain_history_statistics(),
        SubSystemEnum::ImageEditor => get_imageeditor_history_statistics(),
        SubSystemEnum::PixelEditor => get_pixeleditor_history_statistics(),
        SubSystemEnum::DataBaseClient => get_databaseclient_history_statistics(),
        SubSystemEnum::DockerClient => get_dockerclient_history_statistics(),
        SubSystemEnum::ApiClient => get_apiclient_history_statistics(),
    }
}
/// All subsystems that own a ledger. Used for iteration / migration.
fn all_subsystems() -> [SubSystemEnum; 12] {
    [
        SubSystemEnum::General,
        SubSystemEnum::Finance,
        SubSystemEnum::Map,
        SubSystemEnum::CodeEditor,
        SubSystemEnum::Video,
        SubSystemEnum::SandBox3D,
        SubSystemEnum::BlockChain,
        // New subsystems
        SubSystemEnum::ImageEditor,
        SubSystemEnum::PixelEditor,
        SubSystemEnum::DataBaseClient,
        SubSystemEnum::DockerClient,
        SubSystemEnum::ApiClient,
    ]
}
/// Which pipeline produced a record.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChatSource {
    /// Any chat subsystem routed through `cmd_send_chat_message_async`.
    Chat,
    /// A user-defined cron task executed by `ScheduledTaskExecutor`.
    ScheduledTask,
    /// The 3D scene generator in `subsystem::generate_3d`.
    Generate3D,
}
impl Default for ChatSource {
    fn default() -> Self {
        ChatSource::Chat
    }
}
/// One message-level record in the statistics ledger.
///
/// A single LLM call produces one record. Provider / model are captured at
/// submit time and never mutated afterwards; only `content`, `input_tokens`
/// and `output_tokens` are patched once the task completes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStatisticsRecord {
    /// Hippox core task id (or scheduled task id for `ScheduledTask`).
    /// Guaranteed unique by the producer.
    pub task_id: String,
    /// Session id. Empty string for records that are not tied to a chat
    /// session (e.g. scheduled tasks).
    #[serde(default)]
    pub session_id: String,
    /// Chat subsystem this record belongs to. Only meaningful when
    /// `source == Chat`; other sources use `General` as a neutral value.
    #[serde(default)]
    pub subsystem: SubSystemEnum,
    /// "user" or "llm". Currently only "llm" is used.
    pub role: String,
    /// Which pipeline produced this record.
    #[serde(default)]
    pub source: ChatSource,
    /// Chat provider name captured at submit time, e.g. "openai" / "anthropic".
    #[serde(default)]
    pub provider: String,
    /// Concrete model id captured at submit time, when known.
    #[serde(default)]
    pub model: String,
    /// Message body: the final LLM output, filled in when the task completes.
    #[serde(default)]
    pub content: String,
    /// Workflow mode used for the exchange, e.g. "ReAct".
    #[serde(default)]
    pub workflow_mode: String,
    /// Input tokens consumed by this call, filled in when the task completes.
    #[serde(default)]
    pub input_tokens: u64,
    /// Output tokens produced by this call, filled in when the task completes.
    #[serde(default)]
    pub output_tokens: u64,
    /// Unix milliseconds when the record was created (submit time).
    pub created_at: u64,
}
impl ChatStatisticsRecord {
    /// Build a record. Provider / model are the submit-time snapshot;
    /// content and tokens are usually left empty here and patched later.
    pub fn new(
        task_id: &str,
        session_id: &str,
        subsystem: SubSystemEnum,
        role: &str,
        source: ChatSource,
        content: &str,
        model: &str,
        provider: &str,
        workflow_mode: &str,
        input_tokens: u64,
        output_tokens: u64,
    ) -> Self {
        Self {
            task_id: task_id.to_string(),
            session_id: session_id.to_string(),
            subsystem,
            role: role.to_string(),
            source,
            provider: provider.to_string(),
            model: model.to_string(),
            content: content.to_string(),
            workflow_mode: workflow_mode.to_string(),
            input_tokens,
            output_tokens,
            created_at: now_millis(),
        }
    }
    /// Build an "llm" record.
    pub fn llm(
        task_id: &str,
        session_id: &str,
        subsystem: SubSystemEnum,
        source: ChatSource,
        content: &str,
        model: &str,
        provider: &str,
        workflow_mode: &str,
        input_tokens: u64,
        output_tokens: u64,
    ) -> Self {
        Self::new(task_id, session_id, subsystem, "llm", source, content, model, provider, workflow_mode, input_tokens, output_tokens)
    }
}
/// Patch applied to an existing record when the task completes.
#[derive(Debug, Clone, Default)]
pub struct RecordPatch {
    /// Final content (LLM output). `None` leaves the existing value alone.
    pub content: Option<String>,
    /// Final input token count. `None` leaves the existing value alone.
    pub input_tokens: Option<u64>,
    /// Final output token count. `None` leaves the existing value alone.
    pub output_tokens: Option<u64>,
}
/// Root structure of one `statistics.json` file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStatistics {
    /// Schema version, bumped when the record shape changes.
    #[serde(default = "default_version")]
    pub version: u32,
    /// Running total of input tokens across every record below.
    #[serde(default)]
    pub total_input_tokens: u64,
    /// Running total of output tokens across every record below.
    #[serde(default)]
    pub total_output_tokens: u64,
    /// Running count of distinct task ids.
    #[serde(default)]
    pub total_task_count: u64,
    /// Append-only list of records, newest first.
    #[serde(default)]
    pub records: Vec<ChatStatisticsRecord>,
}
fn default_version() -> u32 {
    1
}
impl ChatStatistics {
    pub fn empty() -> Self {
        Self { version: default_version(), total_input_tokens: 0, total_output_tokens: 0, total_task_count: 0, records: Vec::new() }
    }
    /// Append one record, keeping the aggregate counters in sync.
    pub fn append(&mut self, record: ChatStatisticsRecord) {
        self.total_input_tokens = self.total_input_tokens.saturating_add(record.input_tokens);
        self.total_output_tokens = self.total_output_tokens.saturating_add(record.output_tokens);
        let seen_before = self.records.iter().any(|r| r.task_id == record.task_id);
        if !seen_before {
            self.total_task_count = self.total_task_count.saturating_add(1);
        }
        // Newest first.
        self.records.insert(0, record);
    }
    /// Returns true when a record with the given `task_id` + `role` already
    /// exists. Used to make appends idempotent when a task is reprocessed.
    pub fn contains(&self, task_id: &str, role: &str) -> bool {
        self.records.iter().any(|r| r.task_id == task_id && r.role == role)
    }
    /// Patch an existing record identified by `(task_id, role)`.
    fn patch(&mut self, task_id: &str, role: &str, patch: RecordPatch) -> Option<(i64, i64)> {
        let record = self.records.iter_mut().find(|r| r.task_id == task_id && r.role == role)?;
        let old_input = record.input_tokens as i64;
        let old_output = record.output_tokens as i64;
        if let Some(content) = patch.content {
            record.content = content;
        }
        if let Some(input_tokens) = patch.input_tokens {
            record.input_tokens = input_tokens;
        }
        if let Some(output_tokens) = patch.output_tokens {
            record.output_tokens = output_tokens;
        }
        let new_input = record.input_tokens as i64;
        let new_output = record.output_tokens as i64;
        Some((new_input - old_input, new_output - old_output))
    }
}
// Cache manager (memory is the source of truth)
struct StatisticsCacheManager {
    /// In-memory statistics ledgers, one per subsystem (authoritative).
    statistics: Arc<RwLock<HashMap<SubSystemEnum, ChatStatistics>>>,
    /// Persistence signal. Carries the subsystem that just became dirty.
    statistics_tx: mpsc::UnboundedSender<SubSystemEnum>,
}
impl StatisticsCacheManager {
    fn new() -> Self {
        let (statistics_tx, mut statistics_rx) = mpsc::unbounded_channel::<SubSystemEnum>();
        // Load every subsystem ledger, then migrate any cross-subsystem
        // records that were historically written into the General file.
        let statistics = Arc::new(RwLock::new(Self::load_all_statistics_from_disk()));
        Self::migrate_legacy_general_records(&statistics);
        {
            let statistics_clone = statistics.clone();
            tokio::spawn(async move {
                let flush_interval = Duration::from_millis(FLUSH_INTERVAL_MILLIS);
                let mut dirty: HashSet<SubSystemEnum> = HashSet::new();
                loop {
                    tokio::select! {
                        Some(subsystem) = statistics_rx.recv() => {
                            dirty.insert(subsystem);
                        }
                        _ = time::sleep(flush_interval) => {
                            if dirty.is_empty() {
                                continue;
                            }
                            // Snapshot the dirty subsystems and clear the set
                            // before the async persist, so records appended
                            // during the write re-mark their subsystem dirty.
                            let to_flush: Vec<SubSystemEnum> = dirty.drain().collect();
                            let snapshots: Vec<(SubSystemEnum, ChatStatistics)> = {
                                let guard = statistics_clone.read();
                                to_flush
                                    .into_iter()
                                    .map(|sub| {
                                        let ledger = guard.get(&sub).cloned().unwrap_or_else(ChatStatistics::empty);
                                        (sub, ledger)
                                    })
                                    .collect()
                            };
                            for (subsystem, snapshot) in snapshots {
                                tokio::task::spawn_blocking(move || {
                                    if let Err(e) = Self::save_statistics_to_disk(subsystem, &snapshot) {
                                        log::error!(
                                            "[Statistics] Failed to persist statistics for {}: {}",
                                            subsystem,
                                            e
                                        );
                                    } else {
                                        log::debug!(
                                            "[Statistics] Persisted statistics for {} ({} records, {} tasks)",
                                            subsystem,
                                            snapshot.records.len(),
                                            snapshot.total_task_count
                                        );
                                    }
                                });
                            }
                        }
                    }
                }
            });
        }
        Self { statistics, statistics_tx }
    }
    /// Load every subsystem ledger from disk once, falling back to an empty ledger when a file is missing or unreadable.
    fn load_all_statistics_from_disk() -> HashMap<SubSystemEnum, ChatStatistics> {
        let mut map = HashMap::new();
        for subsystem in all_subsystems() {
            map.insert(subsystem, Self::load_statistics_for_subsystem(subsystem));
        }
        map
    }
    /// Load a single subsystem ledger from its on-disk file.
    fn load_statistics_for_subsystem(subsystem: SubSystemEnum) -> ChatStatistics {
        let path = statistics_path_for(subsystem);
        if !path.exists() {
            return ChatStatistics::empty();
        }
        match FileUtils::read_file_to_string(&path) {
            Ok(content) => match serde_json::from_str::<ChatStatistics>(&content) {
                Ok(stats) => stats,
                Err(e) => {
                    log::warn!("[Statistics] Failed to parse statistics {:?}: {}", path, e);
                    ChatStatistics::empty()
                }
            },
            Err(e) => {
                log::warn!("[Statistics] Failed to read statistics {:?}: {}", path, e);
                ChatStatistics::empty()
            }
        }
    }
    /// One-time migration for legacy data.
    fn migrate_legacy_general_records(statistics: &Arc<RwLock<HashMap<SubSystemEnum, ChatStatistics>>>) {
        let mut migrated: HashMap<SubSystemEnum, ChatStatistics> = HashMap::new();
        {
            let mut guard = statistics.write();
            let general = match guard.get_mut(&SubSystemEnum::General) {
                Some(g) => g,
                None => return,
            };
            // Partition records: keep General, move the rest.
            let mut kept: Vec<ChatStatisticsRecord> = Vec::with_capacity(general.records.len());
            let mut moved: Vec<ChatStatisticsRecord> = Vec::new();
            for record in general.records.drain(..) {
                if record.subsystem == SubSystemEnum::General {
                    kept.push(record);
                } else {
                    moved.push(record);
                }
            }
            if moved.is_empty() {
                // Nothing to migrate; restore the drained records.
                general.records = kept;
                return;
            }
            general.records = kept;
            // Recompute the General aggregate counters from the kept records.
            *general = Self::rebuild_ledger(general.records.clone());
            // Group moved records by their target subsystem.
            for record in moved {
                let target = record.subsystem;
                migrated.entry(target).or_insert_with(ChatStatistics::empty).append(record);
            }
            // Merge migrated records into their target ledgers.
            for (subsystem, migrated_ledger) in migrated.iter() {
                let target = guard.entry(*subsystem).or_insert_with(ChatStatistics::empty);
                for record in migrated_ledger.records.iter().cloned() {
                    if !target.contains(&record.task_id, &record.role) {
                        target.append(record);
                    }
                }
            }
            log::info!("[Statistics] Migrated legacy General records into {} subsystem ledger(s)", migrated.len());
        }
        // Persist the migrated ledgers plus the trimmed General ledger.
        let mut to_persist: Vec<(SubSystemEnum, ChatStatistics)> = Vec::new();
        {
            let guard = statistics.read();
            if let Some(general) = guard.get(&SubSystemEnum::General) {
                to_persist.push((SubSystemEnum::General, general.clone()));
            }
            for subsystem in migrated.keys() {
                if let Some(ledger) = guard.get(subsystem) {
                    to_persist.push((*subsystem, ledger.clone()));
                }
            }
        }
        for (subsystem, ledger) in to_persist {
            if let Err(e) = Self::save_statistics_to_disk(subsystem, &ledger) {
                log::error!("[Statistics] Failed to persist migrated ledger for {}: {}", subsystem, e);
            }
        }
    }
    /// Recompute aggregate counters for a ledger from a raw record list.
    fn rebuild_ledger(records: Vec<ChatStatisticsRecord>) -> ChatStatistics {
        let mut ledger = ChatStatistics::empty();
        // `append` inserts at the front, so iterate in reverse to preserve
        // the original newest-first order.
        let mut seen_tasks: HashSet<String> = HashSet::new();
        let mut total_input = 0u64;
        let mut total_output = 0u64;
        for record in &records {
            total_input = total_input.saturating_add(record.input_tokens);
            total_output = total_output.saturating_add(record.output_tokens);
            seen_tasks.insert(record.task_id.clone());
        }
        ledger.records = records;
        ledger.total_input_tokens = total_input;
        ledger.total_output_tokens = total_output;
        ledger.total_task_count = seen_tasks.len() as u64;
        ledger
    }
    /// Persist a single subsystem ledger to its on-disk file.
    fn save_statistics_to_disk(subsystem: SubSystemEnum, stats: &ChatStatistics) -> Result<(), String> {
        let path = statistics_path_for(subsystem);
        if let Some(parent) = path.parent() {
            FileUtils::ensure_dir(parent).map_err(|e| format!("Failed to create statistics dir: {}", e))?;
        }
        let content = serde_json::to_string_pretty(stats).map_err(|e| format!("Failed to serialize statistics: {}", e))?;
        FileUtils::write_file_string(&path, &content).map_err(|e| format!("Failed to write statistics: {}", e))
    }
    /// Append a record to the in-memory ledger of its owning subsystem.
    fn append(&self, record: ChatStatisticsRecord) {
        let subsystem = record.subsystem;
        let task_id = record.task_id.clone();
        let role = record.role.clone();
        let appended = {
            let mut guard = self.statistics.write();
            let ledger = guard.entry(subsystem).or_insert_with(ChatStatistics::empty);
            if ledger.contains(&task_id, &role) {
                log::debug!("[Statistics] record ({}, {}) already present in {}, skipping", task_id, role, subsystem);
                false
            } else {
                ledger.append(record);
                true
            }
        };
        if appended {
            let _ = self.statistics_tx.send(subsystem);
        }
    }
    /// Patch an existing record within its owning subsystem.
    fn update(&self, task_id: &str, role: &str, patch: RecordPatch) {
        let mut owner: Option<SubSystemEnum> = None;
        {
            let mut guard = self.statistics.write();
            // Find which subsystem currently holds this record.
            for (subsystem, ledger) in guard.iter_mut() {
                if !ledger.contains(task_id, role) {
                    continue;
                }
                match ledger.patch(task_id, role, patch.clone()) {
                    Some((delta_in, delta_out)) => {
                        // Keep aggregate counters in sync with the patched record.
                        ledger.total_input_tokens = (ledger.total_input_tokens as i64 + delta_in).max(0) as u64;
                        ledger.total_output_tokens = (ledger.total_output_tokens as i64 + delta_out).max(0) as u64;
                        owner = Some(*subsystem);
                    }
                    None => {}
                }
                break;
            }
        }
        match owner {
            Some(subsystem) => {
                let _ = self.statistics_tx.send(subsystem);
            }
            None => {
                log::debug!("[Statistics] record ({}, {}) not found, update skipped", task_id, role);
            }
        }
    }
    /// Snapshot a single subsystem ledger.
    fn statistics_snapshot_for(&self, subsystem: SubSystemEnum) -> ChatStatistics {
        self.statistics.read().get(&subsystem).cloned().unwrap_or_else(ChatStatistics::empty)
    }
    /// Snapshot and merge every subsystem ledger into one aggregate.
    fn statistics_snapshot_merged(&self) -> ChatStatistics {
        let guard = self.statistics.read();
        let mut records: Vec<ChatStatisticsRecord> = Vec::new();
        let mut total_input = 0u64;
        let mut total_output = 0u64;
        let mut total_tasks = 0u64;
        for (_, ledger) in guard.iter() {
            total_input = total_input.saturating_add(ledger.total_input_tokens);
            total_output = total_output.saturating_add(ledger.total_output_tokens);
            total_tasks = total_tasks.saturating_add(ledger.total_task_count);
            records.extend(ledger.records.iter().cloned());
        }
        // Newest first across all subsystems.
        records.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        ChatStatistics {
            version: default_version(),
            total_input_tokens: total_input,
            total_output_tokens: total_output,
            total_task_count: total_tasks,
            records,
        }
    }
}
/// Global statistics cache manager.
static STATISTICS_CACHE: OnceCell<StatisticsCacheManager> = OnceCell::new();
/// Get (or lazily initialize) the statistics cache manager.
fn statistics_cache() -> &'static StatisticsCacheManager {
    STATISTICS_CACHE.get_or_init(StatisticsCacheManager::new)
}
/// Append a record to the statistics ledger.
pub fn append_record(record: ChatStatisticsRecord) {
    statistics_cache().append(record);
}
/// Patch an existing record identified by `(task_id, role)`.
pub fn update_record(task_id: &str, role: &str, patch: RecordPatch) {
    statistics_cache().update(task_id, role, patch);
}
/// Read the merged statistics ledger across every subsystem.
///
/// Retained for backwards compatibility with the existing frontend contract.
#[command]
pub fn cmd_get_statistics() -> Result<ChatStatistics, String> {
    log::debug!("cmd_get_statistics - START");
    Ok(statistics_cache().statistics_snapshot_merged())
}
/// Read the statistics ledger of a single subsystem.
#[command]
pub fn cmd_get_statistics_by_subsystem(subsystem: String) -> Result<ChatStatistics, String> {
    log::debug!("cmd_get_statistics_by_subsystem - START: subsystem={}", subsystem);
    let subsystem_enum = SubSystemEnum::from_str(&subsystem)?;
    Ok(statistics_cache().statistics_snapshot_for(subsystem_enum))
}
/// Rebuild every subsystem ledger from its current in-memory snapshot.
#[command]
pub fn cmd_rebuild_statistics() -> Result<ChatStatistics, String> {
    log::debug!("cmd_rebuild_statistics - START");
    let cache_ref = statistics_cache();
    let mut rebuilt_subsystems: Vec<(SubSystemEnum, ChatStatistics)> = Vec::new();
    {
        let mut guard = cache_ref.statistics.write();
        for subsystem in all_subsystems() {
            let ledger = guard.entry(subsystem).or_insert_with(ChatStatistics::empty);
            let rebuilt = StatisticsCacheManager::rebuild_ledger(ledger.records.clone());
            *ledger = rebuilt.clone();
            rebuilt_subsystems.push((subsystem, rebuilt));
        }
    }
    // Mark every subsystem dirty so the worker persists the rebuilt ledgers.
    for (subsystem, rebuilt) in rebuilt_subsystems.iter() {
        let _ = cache_ref.statistics_tx.send(*subsystem);
        log::info!("cmd_rebuild_statistics - rebuilt {} with {} records, {} tasks", subsystem, rebuilt.records.len(), rebuilt.total_task_count);
    }
    // Return the merged view to preserve the existing return contract.
    let merged = cache_ref.statistics_snapshot_merged();
    log::info!("cmd_rebuild_statistics - merged view has {} records, {} tasks", merged.records.len(), merged.total_task_count);
    Ok(merged)
}
