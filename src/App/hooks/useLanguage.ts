import { useState, useEffect } from "react";
import { appConfig } from "../../config";
import { useTranslation } from "../../hooks/useTranslation";
import { Language } from "../../types/types";
import { hippoxCommands } from "../../command/chat";
import { configCommands } from "../../command/config";
import { taskManager } from "../../core/TaskManager";

export function useLanguage(initialLanguage?: string) {
  const [language, setLanguage] = useState<Language>(() => {
    if (initialLanguage) {
      return initialLanguage as Language;
    }
    const saved = localStorage.getItem("hippox-language");
    return (saved === "zh" || saved === "en") ? saved as Language : "en";
  });

  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage as Language);
    }
  }, [initialLanguage]);

  const { t } = useTranslation(language);

  const handleToggleLanguage = async () => {
    const newLang = language === "zh" ? "en" : "zh";
    setLanguage(newLang);
    await configCommands.saveSettingsLanguage(newLang);
    localStorage.setItem("hippox-language", newLang);
    await hippoxCommands.setLanguage(newLang);
    window.dispatchEvent(
      new CustomEvent("language-changed", {
        detail: { language: newLang },
      }),
    );
    // const assistantMessages = taskManager.getAssistantMessages();
    // const welcomeMsg = assistantMessages.find((m) => m.id === "welcome");
    // if (welcomeMsg) {
    //   const newContent = appConfig.getWelcomeMessage(newLang);
    //   taskManager.updateAssistantMessage("welcome", {
    //     content: newContent,
    //     timestamp: new Date().toISOString(),
    //   });
    // }
  };

  return {
    language,
    setLanguage,
    handleToggleLanguage,
    t,
  };
}