export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: string;
  children?: MenuItem[];
}

export interface MenuItemWithSection extends MenuItem {
  section?: "main" | "ai" | "config";
}

export interface PopupMenuProps {
  items: MenuItemWithSection[];
  activeId: string;
  activeSubId?: string;
  activeSubSubId?: string;
  onMenuClick: (id: string, subId?: string, subSubId?: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
  t: (key: string) => string;
}

export interface SidebarProps {
  collapsed: boolean;
  onResetSession: () => void;
  onClearLogs: () => void;
  onMenuClick?: (view: string, subView?: string, subSubView?: string) => void;
  onNewSession?: () => void;
  currentSessionId?: string;
  onSwitchSession?: (sessionId: string) => void;
  onOpenSkillsManager?: () => void;
  t: (key: string, params?: any) => string;
}