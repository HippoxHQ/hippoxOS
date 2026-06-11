import { useState, useEffect } from "react";
import { hippoxCommands } from "../../command/chat";
import { configCommands } from "../../command/config";

export function useConfigLoader() {
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [initialEngineConfig, setInitialEngineConfig] = useState<any>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedTheme = await configCommands.getSettingsTheme();
        const savedLanguage = await configCommands.getSettingsLanguage();
        const fullConfig = await configCommands.getConfig();
        if (fullConfig.engine) {
          setInitialEngineConfig(fullConfig.engine);
        }
        await hippoxCommands.setLanguage(savedLanguage);
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setIsConfigLoaded(true);
      }
    };
    loadConfig();
  }, []);

  return {
    isConfigLoaded,
    initialEngineConfig,
  };
}