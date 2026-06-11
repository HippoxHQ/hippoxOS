import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { SystemEvent } from "../../types/type";
import { filesCommands } from "../../command/files";
import { getDataPaths } from "../../command/paths";

export function useSystemEvents(
  onNewSession: () => void,
  onOpenSkillsMarket: () => void,
  onOpenHistory: () => void,
  onOpenFavorites: () => void,
  onOpenScheduledTasks: () => void,
  onOpenSettings: (subView?: string) => void,
) {
  useEffect(() => {
    const unlistenNewSession = listen(SystemEvent.NewSession, () => {
      onNewSession();
    });
    const unlistenOpenSkillsMarket = listen(
      SystemEvent.OpenSkillsMarket,
      () => {
        onOpenSkillsMarket();
      },
    );
    const unlistenOpenHistory = listen(SystemEvent.OpenHistory, () => {
      onOpenHistory();
    });
    const unlistenOpenFavorites = listen(SystemEvent.OpenFavorites, () => {
      onOpenFavorites();
    });
    const unlistenOpenScheduledTasks = listen(
      SystemEvent.OpenScheduledTasks,
      () => {
        onOpenScheduledTasks();
      },
    );
    const unlistenOpenSettings = listen(SystemEvent.OpenSettings, () => {
      onOpenSettings("llmModel");
    });
    const unlistenOpenLlmConfig = listen(SystemEvent.OpenLlmConfig, () => {
      onOpenSettings("llmModel");
    });
    const unlistenCheckUpdates = listen(SystemEvent.CheckUpdates, () => {});
    const unlistenShowAbout = listen(SystemEvent.ShowAbout, () => {});
    const unlistenShowNotification = listen(
      SystemEvent.ShowNotification,
      () => {},
    );
    
    return () => {
      unlistenNewSession.then((fn) => fn());
      unlistenOpenSkillsMarket.then((fn) => fn());
      unlistenOpenHistory.then((fn) => fn());
      unlistenOpenFavorites.then((fn) => fn());
      unlistenOpenScheduledTasks.then((fn) => fn());
      unlistenOpenSettings.then((fn) => fn());
      unlistenOpenLlmConfig.then((fn) => fn());
      unlistenCheckUpdates.then((fn) => fn());
      unlistenShowAbout.then((fn) => fn());
      unlistenShowNotification.then((fn) => fn());
    };
  }, [onNewSession, onOpenSkillsMarket, onOpenHistory, onOpenFavorites, onOpenScheduledTasks, onOpenSettings]);
}

export function useDirectoryEvents() {
  useEffect(() => {
    const unlistenOpenLogsDir = listen("open-logs-dir", async () => {
      const paths = await getDataPaths();
      if (paths.log_dir) await filesCommands.openPath(paths.log_dir);
    });
    const unlistenOpenHistoryDir = listen("open-history-dir", async () => {
      const paths = await getDataPaths();
      if (paths.dialog_history_dir)
        await filesCommands.openPath(paths.dialog_history_dir);
    });
    const unlistenOpenSkillsMarketDir = listen(
      "open-skills-market-dir",
      async () => {
        const paths = await getDataPaths();
        if (paths.skills_market_dir)
          await filesCommands.openPath(paths.skills_market_dir);
      },
    );
    const unlistenOpenScheduledTasksDir = listen(
      "open-scheduled-tasks-dir",
      async () => {
        const paths = await getDataPaths();
        if (paths.scheduled_tasks_dir)
          await filesCommands.openPath(paths.scheduled_tasks_dir);
      },
    );
    const unlistenOpenSettingsDir = listen("open-settings-dir", async () => {
      const paths = await getDataPaths();
      if (paths.settings_dir) await filesCommands.openPath(paths.settings_dir);
    });

    return () => {
      unlistenOpenLogsDir.then((fn) => fn());
      unlistenOpenHistoryDir.then((fn) => fn());
      unlistenOpenSkillsMarketDir.then((fn) => fn());
      unlistenOpenScheduledTasksDir.then((fn) => fn());
      unlistenOpenSettingsDir.then((fn) => fn());
    };
  }, []);
}