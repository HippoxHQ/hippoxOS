export interface WelcomeMessageConfig {
    zh: string;
    en: string;
}

class AppConfig {
    private static instance: AppConfig;

    private welcomeMessages: WelcomeMessageConfig = {
        zh: "你好，我是 Hippox AI 运行时。我有自主决策能力，可以执行技能并实时反馈。有什么可以帮你的？",
        en: "Hello, I am Hippox AI Runtime. I have autonomous decision-making capabilities and can execute skills with real-time feedback. How can I help you?"
    };

    private resetSessionMessages: WelcomeMessageConfig = {
        zh: "会话已重置。Hippox 运行时重新就绪，自主决策引擎已刷新。",
        en: "Session reset. Hippox runtime ready, decision engine refreshed."
    };

    private constructor() { }

    static getInstance(): AppConfig {
        if (!AppConfig.instance) {
            AppConfig.instance = new AppConfig();
        }
        return AppConfig.instance;
    }

    getWelcomeMessage(language: "zh" | "en"): string {
        return this.welcomeMessages[language];
    }

    getResetSessionMessage(language: "zh" | "en"): string {
        return this.resetSessionMessages[language];
    }

    updateWelcomeMessage(language: "zh" | "en", message: string) {
        this.welcomeMessages[language] = message;
    }

    getWelcomeMessages(): WelcomeMessageConfig {
        return { ...this.welcomeMessages };
    }
}

export const appConfig = AppConfig.getInstance();