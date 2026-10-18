use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WindowType {
    Main,
    Tray,
    TraySubmenu,
    MaterialPreview,
    About,
    /// Full‑screen, chrome‑less overlay used to pick a capture region.
    RegionSelect,
    /// About-like window used to show update notes and actions.
    Update,
}
impl std::fmt::Display for WindowType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WindowType::Main => write!(f, "main"),
            WindowType::Tray => write!(f, "tray"),
            WindowType::TraySubmenu => write!(f, "tray-submenu"),
            WindowType::MaterialPreview => write!(f, "material-preview"),
            WindowType::About => write!(f, "about-window"),
            WindowType::RegionSelect => write!(f, "region-select"),
            WindowType::Update => write!(f, "update-window"),
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
    /// Stable label for the region‑selection overlay window.
    RegionSelect,
    /// Stable label for the update window.
    Update,
}
impl std::fmt::Display for WindowIdentifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WindowIdentifier::Main => write!(f, "main-window"),
            WindowIdentifier::Tray => write!(f, "tray-window"),
            WindowIdentifier::TraySubmenu => write!(f, "tray-submenu-window"),
            WindowIdentifier::MaterialPreview => write!(f, "material-preview-window"),
            WindowIdentifier::About => write!(f, "about-window"),
            WindowIdentifier::RegionSelect => write!(f, "region-select-window"),
            WindowIdentifier::Update => write!(f, "update-window"),
        }
    }
}