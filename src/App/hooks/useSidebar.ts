import { useState } from "react";
export function useSidebar() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };
  return {
    sidebarCollapsed,
    toggleSidebar,
  };
}