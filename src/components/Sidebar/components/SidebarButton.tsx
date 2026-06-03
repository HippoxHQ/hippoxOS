import React from "react";
import { MenuItemWithSection } from "../types";
import { iconMap } from "../../../icons";

interface SidebarButtonProps {
  item: MenuItemWithSection;
  isActive: boolean;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>, label: string) => void;
  onMouseLeave: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

export const SidebarButton: React.FC<SidebarButtonProps> = ({
  item,
  isActive,
  label,
  onClick,
  onMouseEnter,
  onMouseLeave,
  buttonRef,
}) => {
  const IconComp = iconMap[item.icon];

  return (
    <button
      ref={buttonRef}
      className={`sidebar-icon-btn ${isActive ? "active" : ""}`}
      onClick={onClick}
      onMouseEnter={(e) => onMouseEnter(e, label)}
      onMouseLeave={onMouseLeave}
    >
      {IconComp && <IconComp size={18} />}
      {item.badge && <span className="icon-badge" />}
    </button>
  );
};