import React, { forwardRef } from "react";
/**
 * Props for the OfficePanel component.
 */
export interface OfficePanelProps {
  /** Translation function */
  t?: (key: string, params?: any) => string;
  /** Current session ID */
  currentSessionId?: string;
  /** Language code */
  language?: "zh" | "en";
  /** Callback to navigate back to welcome page */
  onBackToWelcome?: () => void;
  /** Optional className for the outer container */
  className?: string;
  /** Optional style override for the outer container */
  style?: React.CSSProperties;
}
/**
 * Ref handle exposed by OfficePanel.
 */
export interface OfficePanelRef {
  /** Get the currently active tool (placeholder) */
  getActiveTool?: () => string;
  /** Programmatically set the active tool (placeholder) */
  setActiveTool?: (tool: string) => void;
}
/**
 * Placeholder OfficePanel.
 * Renders a simple placeholder until the real office workspace is implemented.
 */
const OfficePanel = forwardRef<OfficePanelRef, OfficePanelProps>(({ className, style }, ref) => {
  React.useImperativeHandle(ref, () => ({
    getActiveTool: () => "",
    setActiveTool: () => {},
  }));
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        color: "var(--text-secondary)",
        fontSize: "16px",
        fontWeight: 600,
        ...style,
      }}
    >
      Office Panel
    </div>
  );
});
OfficePanel.displayName = "OfficePanel";
export default OfficePanel;
