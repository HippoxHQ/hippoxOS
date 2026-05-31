use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Role {
    User,
    LLM,
    System,
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::User => write!(f, "User"),
            Role::LLM => write!(f, "LLM"),
            Role::System => write!(f, "System"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WindowType {
    Main,
    Tray,
    TraySubmenu,
}

impl std::fmt::Display for WindowType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WindowType::Main => write!(f, "main"),
            WindowType::Tray => write!(f, "tray"),
            WindowType::TraySubmenu => write!(f, "tray-submenu"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WindowIdentifier {
    Main,
    Tray,
    TraySubmenu,
}

impl std::fmt::Display for WindowIdentifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WindowIdentifier::Main => write!(f, "main-window"),
            WindowIdentifier::Tray => write!(f, "tray-window"),
            WindowIdentifier::TraySubmenu => write!(f, "tray-submenu-window"),
        }
    }
}
