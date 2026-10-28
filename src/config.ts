export const HIPPOX_ASCII_LOGO = `
██╗  ██╗██╗██████╗ ██████╗  ██████╗ ██╗  ██╗      ██████╗  ███████╗
██║  ██║██║██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝     ██╔═══██╗ ██╔════╝
███████║██║██████╔╝██████╔╝██║   ██║ ╚███╔╝      ██║   ██║ ███████╗
██╔══██║██║██╔═══╝ ██╔═══╝ ██║   ██║ ██╔██╗      ██║   ██║ ╚════██║
██║  ██║██║██║     ██║     ╚██████╔╝██╔╝ ██╗     ╚██████╔╝ ███████║
╚═╝  ╚═╝╚═╝╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝      ╚═════╝  ╚══════╝
`;
export interface WelcomeMessageConfig {
    zh: string;
    en: string;
}
class AppConfig {
    private static instance: AppConfig;
    private constructor() { }
    static getInstance(): AppConfig {
        if (!AppConfig.instance) {
            AppConfig.instance = new AppConfig();
        }
        return AppConfig.instance;
    }
}
export const appConfig = AppConfig.getInstance();

// subsystem switch
export const SubSytemSwitch = {
    generalChat: true,
    videoEditor: true,
    audioEditor: true,
    chartChat: true,
    codeEditorChat: true,
    mapChat: true,
    sandbox3d: true,
    blockchain: false,
    imageEditor: false,
    pixelEditor: true,
    databaseClient: false,
    dockerClient: true,
    apiClient: false,
}