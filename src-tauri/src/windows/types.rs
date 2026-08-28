use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WindowType {
    Main,
    Tray,
    TraySubmenu,
    MaterialPreview,
    About,
}
impl std::fmt::Display for WindowType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WindowType::Main => write!(f, "main"),
            WindowType::Tray => write!(f, "tray"),
            WindowType::TraySubmenu => write!(f, "tray-submenu"),
            WindowType::MaterialPreview => write!(f, "material-preview"),
            WindowType::About => write!(f, "about-window"),
        }
    }
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WindowIdentifier {
    Main,
    Tray,
    TraySubmenu,
    MaterialPreview,
    About,
}
impl std::fmt::Display for WindowIdentifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WindowIdentifier::Main => write!(f, "main-window"),
            WindowIdentifier::Tray => write!(f, "tray-window"),
            WindowIdentifier::TraySubmenu => write!(f, "tray-submenu-window"),
            WindowIdentifier::MaterialPreview => write!(f, "material-preview-window"),
            WindowIdentifier::About => write!(f, "about-window"),
        }
    }
}
