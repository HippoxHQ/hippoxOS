import { useState, useEffect } from "react";
import { hippoxCommands } from "../../api/chat";
import { configCommands } from "../../api/config";
import { appConfig } from "../../config";
import { useTranslation } from "../../hooks/useTranslation";
import { taskManager } from "../../TaskManager";
import { Language } from "../../types/type";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en");
  const { t } = useTranslation(language);

  const handleToggleLanguage = async () => {
    const newLang = language === "zh" ? "en" : "zh";
    setLanguage(newLang);
    await configCommands.saveSettingsLanguage(newLang);
    await hippoxCommands.setLanguage(newLang);
    window.dispatchEvent(
      new CustomEvent("language-changed", {
        detail: { language: newLang },
      }),
    );
    const assistantMessages = taskManager.getAssistantMessages();
    const welcomeMsg = assistantMessages.find((m) => m.id === "welcome");
    if (welcomeMsg) {
      const newContent = appConfig.getWelcomeMessage(newLang);
      taskManager.updateAssistantMessage("welcome", {
        content: newContent,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return {
    language,
    setLanguage,
    handleToggleLanguage,
    t,
  };
}