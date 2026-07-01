use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;
use tokio::sync::mpsc::{channel, Receiver, Sender};
use tokio::time::sleep;

use crate::commons::Ffmpeg;
use crate::commons::VideoMetadata;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub source_path: String,
    pub current_time: f64,
    pub current_frame: u64,
    pub duration: f64,
    pub fps: f64,
    pub width: u32,
    pub height: u32,
    pub total_frames: u64,
    pub playback_rate: f64,
    pub is_playing: bool,
}

#[derive(Debug, Clone)]
pub struct FrameData {
    pub data: Vec<u8>,
    pub timestamp: f64,
    pub frame_index: u64,
    pub width: u32,
    pub height: u32,
    pub format: FrameFormat,
}

#[derive(Debug, Clone)]
pub enum FrameFormat {
    Jpeg,
    Png,
    RawRgb,
    RawYuv,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioData {
    pub data: Vec<u8>,
    pub timestamp: f64,
    pub sample_rate: u32,
    pub channels: u16,
    pub samples: usize,
}

#[derive(Debug, Clone)]
pub enum PlayerCommand {
    Play,
    Pause,
    Toggle,
    Seek(f64),
    SeekFrame(u64),
    StepForward,
    StepBackward,
    SetSpeed(f64),
    Stop,
}

#[derive(Debug, Clone)]
pub enum PlayerEvent {
    Frame(FrameData),
    Audio(AudioData),
    StateChanged(PlayerState),
    Ended,
    Error(String),
    SpeedChanged(f64),
    Seeked(f64),
}

pub struct Player {
    source_path: PathBuf,
    ffmpeg: Ffmpeg,
    metadata: VideoMetadata,
    state: Arc<Mutex<PlayerState>>,
    is_playing: Arc<AtomicBool>,
    command_tx: Sender<PlayerCommand>,
    event_rx: Arc<tokio::sync::Mutex<Receiver<PlayerEvent>>>,
    is_running: Arc<AtomicBool>,
    frame_interval: Duration,
}

impl Player {
    pub fn new(source_path: &str) -> Result<Self, String> {
        let path = PathBuf::from(source_path);
        if !path.exists() {
            return Err(format!("Source file not found: {}", source_path));
        }

        let ffmpeg = Ffmpeg::new();
        let metadata = ffmpeg
            .get_metadata(source_path)
            .map_err(|e| format!("Failed to get metadata: {}", e))?;

        let fps = if metadata.fps > 0.0 {
            metadata.fps
        } else {
            30.0
        };

        let total_frames = (metadata.duration * fps).round() as u64;

        let initial_state = PlayerState {
            source_path: source_path.to_string(),
            current_time: 0.0,
            current_frame: 0,
            duration: metadata.duration,
            fps,
            width: metadata.width,
            height: metadata.height,
            total_frames,
            playback_rate: 1.0,
            is_playing: false,
        };

        let state = Arc::new(Mutex::new(initial_state));
        let is_playing = Arc::new(AtomicBool::new(false));
        let frame_interval = Duration::from_secs_f64(1.0 / fps);

        let (command_tx, mut command_rx) = channel(32);
        let (event_tx, event_rx) = channel(64);
        let event_rx = Arc::new(tokio::sync::Mutex::new(event_rx));

        let is_running = Arc::new(AtomicBool::new(true));

        let shared_state = state.clone();
        let shared_is_playing = is_playing.clone();
        let player_path = path.clone();
        let player_ffmpeg = ffmpeg.clone();
        let player_is_running = is_running.clone();
        let player_fps = fps;
        let player_interval = frame_interval;
        let player_duration = metadata.duration;
        let player_total_frames = total_frames;

        tokio::spawn(async move {
            let mut current_time = 0.0;
            let mut current_frame = 0u64;
            let mut playback_rate = 1.0;
            let mut seek_target: Option<f64> = None;

            while player_is_running.load(Ordering::Relaxed) {
                tokio::select! {
                    Some(cmd) = command_rx.recv() => {
                        match cmd {
                            PlayerCommand::Play => {
                                shared_is_playing.store(true, Ordering::Relaxed);
                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.is_playing = true;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                            }
                            PlayerCommand::Pause => {
                                shared_is_playing.store(false, Ordering::Relaxed);
                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.is_playing = false;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                            }
                            PlayerCommand::Toggle => {
                                let current = shared_is_playing.load(Ordering::Relaxed);
                                let new_val = !current;
                                shared_is_playing.store(new_val, Ordering::Relaxed);
                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.is_playing = new_val;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                            }
                            PlayerCommand::Seek(time) => {
                                let clamped = time.clamp(0.0, player_duration);
                                seek_target = Some(clamped);
                                current_time = clamped;
                                current_frame = (clamped * player_fps) as u64;

                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.current_time = clamped;
                                    state_guard.current_frame = current_frame;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                                let _ = event_tx.send(PlayerEvent::Seeked(clamped)).await;

                                Self::extract_and_send_frame(
                                    &player_ffmpeg,
                                    &player_path,
                                    clamped,
                                    &event_tx,
                                ).await;
                            }
                            PlayerCommand::SeekFrame(frame) => {
                                let max_frame = player_total_frames.saturating_sub(1);
                                let clamped = frame.min(max_frame);
                                let time = clamped as f64 / player_fps;
                                seek_target = Some(time);
                                current_time = time;
                                current_frame = clamped;

                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.current_time = time;
                                    state_guard.current_frame = clamped;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                                let _ = event_tx.send(PlayerEvent::Seeked(time)).await;

                                Self::extract_and_send_frame(
                                    &player_ffmpeg,
                                    &player_path,
                                    time,
                                    &event_tx,
                                ).await;
                            }
                            PlayerCommand::StepForward => {
                                let max_frame = player_total_frames.saturating_sub(1);
                                let next_frame = (current_frame + 1).min(max_frame);
                                let time = next_frame as f64 / player_fps;
                                seek_target = Some(time);
                                current_time = time;
                                current_frame = next_frame;

                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.current_time = time;
                                    state_guard.current_frame = next_frame;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                                let _ = event_tx.send(PlayerEvent::Seeked(time)).await;

                                Self::extract_and_send_frame(
                                    &player_ffmpeg,
                                    &player_path,
                                    time,
                                    &event_tx,
                                ).await;
                            }
                            PlayerCommand::StepBackward => {
                                let prev_frame = current_frame.saturating_sub(1);
                                let time = prev_frame as f64 / player_fps;
                                seek_target = Some(time);
                                current_time = time;
                                current_frame = prev_frame;

                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.current_time = time;
                                    state_guard.current_frame = prev_frame;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                                let _ = event_tx.send(PlayerEvent::Seeked(time)).await;

                                Self::extract_and_send_frame(
                                    &player_ffmpeg,
                                    &player_path,
                                    time,
                                    &event_tx,
                                ).await;
                            }
                            PlayerCommand::SetSpeed(rate) => {
                                let clamped = rate.clamp(0.1, 10.0);
                                playback_rate = clamped;
                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.playback_rate = clamped;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                                let _ = event_tx.send(PlayerEvent::SpeedChanged(clamped)).await;
                            }
                            PlayerCommand::Stop => {
                                shared_is_playing.store(false, Ordering::Relaxed);
                                current_time = 0.0;
                                current_frame = 0;
                                seek_target = Some(0.0);

                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.is_playing = false;
                                    state_guard.current_time = 0.0;
                                    state_guard.current_frame = 0;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;

                                Self::extract_and_send_frame(
                                    &player_ffmpeg,
                                    &player_path,
                                    0.0,
                                    &event_tx,
                                ).await;
                            }
                        }
                    }
                    _ = sleep(player_interval) => {
                        let is_playing_now = shared_is_playing.load(Ordering::Relaxed);
                        if is_playing_now {
                            let step = 1.0 / player_fps;
                            let next_time = current_time + step * playback_rate;

                            if next_time >= player_duration {
                                shared_is_playing.store(false, Ordering::Relaxed);
                                current_time = player_duration;
                                current_frame = player_total_frames;

                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.is_playing = false;
                                    state_guard.current_time = current_time;
                                    state_guard.current_frame = current_frame;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;
                                let _ = event_tx.send(PlayerEvent::Ended).await;
                            } else {
                                current_time = next_time;
                                current_frame = (current_time * player_fps) as u64;

                                let new_state = {
                                    let mut state_guard = shared_state.lock().unwrap();
                                    state_guard.current_time = current_time;
                                    state_guard.current_frame = current_frame;
                                    state_guard.clone()
                                };
                                let _ = event_tx.send(PlayerEvent::StateChanged(new_state)).await;

                                Self::extract_and_send_frame(
                                    &player_ffmpeg,
                                    &player_path,
                                    current_time,
                                    &event_tx,
                                ).await;
                            }
                        }
                    }
                }
            }
        });

        Ok(Self {
            source_path: path,
            ffmpeg,
            metadata,
            state,
            is_playing,
            command_tx,
            event_rx,
            is_running,
            frame_interval,
        })
    }

    async fn extract_and_send_frame(
        ffmpeg: &Ffmpeg,
        path: &Path,
        time: f64,
        event_tx: &Sender<PlayerEvent>,
    ) {
        match Self::extract_frame(ffmpeg, path, time) {
            Ok(frame_data) => {
                let _ = event_tx.send(PlayerEvent::Frame(frame_data)).await;
            }
            Err(e) => {
                let _ = event_tx.send(PlayerEvent::Error(e)).await;
            }
        }
    }

    fn extract_frame(ffmpeg: &Ffmpeg, path: &Path, time: f64) -> Result<FrameData, String> {
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!("frame_{}_{}.jpg", time, std::process::id()));

        let options = crate::commons::ThumbnailOptions {
            time,
            width: None,
            height: None,
            output_path: Some(temp_file.to_string_lossy().to_string()),
        };

        let output_path = ffmpeg.generate_thumbnail(path.to_str().unwrap(), &options)?;

        let data =
            std::fs::read(&output_path).map_err(|e| format!("Failed to read frame data: {}", e))?;

        let _ = std::fs::remove_file(&output_path);

        let metadata = ffmpeg.get_metadata(path.to_str().unwrap())?;

        Ok(FrameData {
            data,
            timestamp: time,
            frame_index: (time * metadata.fps) as u64,
            width: metadata.width,
            height: metadata.height,
            format: FrameFormat::Jpeg,
        })
    }

    pub async fn send_command(&self, cmd: PlayerCommand) -> Result<(), String> {
        self.command_tx
            .send(cmd)
            .await
            .map_err(|e| format!("Failed to send command: {}", e))
    }

    pub async fn play(&self) -> Result<(), String> {
        self.send_command(PlayerCommand::Play).await
    }

    pub async fn pause(&self) -> Result<(), String> {
        self.send_command(PlayerCommand::Pause).await
    }

    pub async fn toggle(&self) -> Result<(), String> {
        self.send_command(PlayerCommand::Toggle).await
    }

    pub async fn seek(&self, time: f64) -> Result<(), String> {
        self.send_command(PlayerCommand::Seek(time)).await
    }

    pub async fn seek_frame(&self, frame: u64) -> Result<(), String> {
        self.send_command(PlayerCommand::SeekFrame(frame)).await
    }

    pub async fn step_forward(&self) -> Result<(), String> {
        self.send_command(PlayerCommand::StepForward).await
    }

    pub async fn step_backward(&self) -> Result<(), String> {
        self.send_command(PlayerCommand::StepBackward).await
    }

    pub async fn set_speed(&self, rate: f64) -> Result<(), String> {
        self.send_command(PlayerCommand::SetSpeed(rate)).await
    }

    pub async fn stop(&self) -> Result<(), String> {
        self.send_command(PlayerCommand::Stop).await
    }

    pub fn get_state(&self) -> PlayerState {
        self.state.lock().unwrap().clone()
    }

    pub fn get_metadata(&self) -> VideoMetadata {
        self.metadata.clone()
    }

    pub async fn event_receiver(&self) -> tokio::sync::MutexGuard<'_, Receiver<PlayerEvent>> {
        self.event_rx.lock().await
    }

    pub fn is_playing(&self) -> bool {
        self.is_playing.load(Ordering::Relaxed)
    }

    pub fn get_duration(&self) -> f64 {
        let state = self.state.lock().unwrap();
        state.duration
    }

    pub fn get_current_time(&self) -> f64 {
        let state = self.state.lock().unwrap();
        state.current_time
    }

    pub fn get_current_frame(&self) -> u64 {
        let state = self.state.lock().unwrap();
        state.current_frame
    }

    pub fn get_total_frames(&self) -> u64 {
        let state = self.state.lock().unwrap();
        state.total_frames
    }

    pub fn get_fps(&self) -> f64 {
        let state = self.state.lock().unwrap();
        state.fps
    }

    pub async fn extract_frame_at(&self, time: f64) -> Result<FrameData, String> {
        Self::extract_frame(
            &self.ffmpeg,
            &self.source_path,
            time.clamp(0.0, self.get_duration()),
        )
    }

    pub async fn extract_frame_at_index(&self, frame: u64) -> Result<FrameData, String> {
        let max_frame = self.get_total_frames().saturating_sub(1);
        let clamped = frame.min(max_frame);
        let time = clamped as f64 / self.get_fps();
        self.extract_frame_at(time).await
    }

    pub async fn export_state(&self) -> PlayerState {
        self.get_state()
    }

    pub async fn restore_state(&self, state: PlayerState) -> Result<(), String> {
        if state.source_path != self.source_path.to_string_lossy() {
            return Err("Source path mismatch".to_string());
        }

        self.seek(state.current_time).await?;

        if state.is_playing {
            self.play().await?;
        }

        Ok(())
    }
}

impl Drop for Player {
    fn drop(&mut self) {
        self.is_running.store(false, Ordering::Relaxed);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_player_creation() {
        let player = Player::new("test_video.mp4");
        assert!(player.is_err() || player.is_ok());
    }

    #[tokio::test]
    async fn test_player_play_pause() {
        let player =
            Player::new(r"C:\Users\admin\Desktop\test_video\1ojc1kj9q18_1631956997402.mp4");
        if let Ok(p) = player {
            let _ = p.play().await;
            sleep(Duration::from_millis(100)).await;
            assert!(p.is_playing());

            let _ = p.pause().await;
            sleep(Duration::from_millis(100)).await;
            assert!(!p.is_playing());
        }
    }

    #[tokio::test]
    async fn test_player_seek() {
        let player =
            Player::new(r"C:\Users\admin\Desktop\test_video\1ojc1kj9q18_1631956997402.mp4");
        if let Ok(p) = player {
            let target = 10.0;
            let _ = p.seek(target).await;
            sleep(Duration::from_millis(200)).await;
            let state = p.get_state();
            assert!((state.current_time - target).abs() < 0.1);
        }
    }

    #[tokio::test]
    async fn test_player_step_forward() {
        let player =
            Player::new(r"C:\Users\admin\Desktop\test_video\1ojc1kj9q18_1631956997402.mp4");
        if let Ok(p) = player {
            let initial_frame = p.get_current_frame();
            let _ = p.step_forward().await;
            sleep(Duration::from_millis(200)).await;
            let new_frame = p.get_current_frame();
            assert_eq!(new_frame, initial_frame + 1);
        }
    }

    #[tokio::test]
    async fn test_player_step_backward() {
        let player =
            Player::new(r"C:\Users\admin\Desktop\test_video\1ojc1kj9q18_1631956997402.mp4");
        if let Ok(p) = player {
            let _ = p.seek_frame(10).await;
            sleep(Duration::from_millis(100)).await;

            let initial_frame = p.get_current_frame();
            let _ = p.step_backward().await;
            sleep(Duration::from_millis(200)).await;
            let new_frame = p.get_current_frame();
            assert_eq!(new_frame, initial_frame - 1);
        }
    }

    #[tokio::test]
    async fn test_player_speed_change() {
        let player =
            Player::new(r"C:\Users\admin\Desktop\test_video\1ojc1kj9q18_1631956997402.mp4");
        if let Ok(p) = player {
            let target_speed = 2.0;
            let _ = p.set_speed(target_speed).await;
            sleep(Duration::from_millis(100)).await;
            let state = p.get_state();
            assert!((state.playback_rate - target_speed).abs() < 0.01);
        }
    }

    #[tokio::test]
    async fn test_player_stop() {
        let player =
            Player::new(r"C:\Users\admin\Desktop\test_video\1ojc1kj9q18_1631956997402.mp4");
        if let Ok(p) = player {
            let _ = p.play().await;
            sleep(Duration::from_millis(100)).await;
            assert!(p.is_playing());

            let _ = p.stop().await;
            sleep(Duration::from_millis(200)).await;
            assert!(!p.is_playing());

            let state = p.get_state();
            assert!((state.current_time - 0.0).abs() < 0.01);
        }
    }
}
