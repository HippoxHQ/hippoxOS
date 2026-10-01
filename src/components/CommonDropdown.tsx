import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
/**
 * CommonDropdownOption
 *
 * A single option in the dropdown menu.
 * - `value`: the underlying value used by the parent.
 * - `label`: the main text shown in the trigger and in the menu.
 * - `subLabel`: optional secondary text shown on the right side of the menu item.
 */
export interface CommonDropdownOption {
  value: string;
  label: string;
  subLabel?: string;
}
interface CommonDropdownProps {
  options: CommonDropdownOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  /**
   * Optional fixed width for the trigger. Defaults to 130px to match the
   * ExportPanel dropdown.
   */
  width?: number;
  /**
   * Optional title attribute for the trigger button.
   */
  title?: string;
  /**
   * Optional minimum width for the menu. Defaults to 200px.
   */
  menuMinWidth?: number;
  /**
   * Optional maximum width for the menu. Defaults to 260px.
   */
  menuMaxWidth?: number;
}
/**
 * CommonDropdown
 */
export const CommonDropdown: React.FC<CommonDropdownProps> = ({
  options,
  value,
  disabled,
  onChange,
  width = 130,
  title,
  menuMinWidth = 200,
  menuMaxWidth = 260,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; ready: boolean } | null>(null);
  const instanceIdRef = useRef<string>(`common-dropdown-${Math.random().toString(36).slice(2, 11)}`);
  const instanceClass = instanceIdRef.current;
  const selected = options.find((o) => o.value === value) || options[0];
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = `${instanceClass}-style`;
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .${instanceClass}::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `;
      document.head.appendChild(styleEl);
    }
    return () => {
      const existing = document.getElementById(styleId);
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    };
  }, [instanceClass]);
  /**
   * Measure the menu and compute its final position.
   * The menu is right-aligned to the trigger and kept inside the viewport.
   */
  const updateMenuPositionWithMeasuredWidth = useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuWidth = menuRef.current.offsetWidth;
    const viewportWidth = window.innerWidth;
    // Right-align: menu right edge == trigger right edge.
    let left = triggerRect.right - menuWidth;
    // Keep the menu inside the viewport with an 8px margin on both sides.
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;
    // Vertical: 4px below the trigger.
    const top = triggerRect.bottom + 4;
    setMenuPosition({ top, left, ready: true });
  }, []);
  // When opening, render the menu off-screen first so we can measure it.
  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    setMenuPosition({ top: triggerRect.bottom + 4, left: -9999, ready: false });
  }, [open]);
  // After the menu is mounted off-screen, measure and reposition it.
  useLayoutEffect(() => {
    if (!open) return;
    if (!menuPosition || menuPosition.ready) return;
    updateMenuPositionWithMeasuredWidth();
  }, [open, menuPosition, updateMenuPositionWithMeasuredWidth]);
  // Reposition on window resize while open.
  useEffect(() => {
    if (!open) return;
    const handleResize = () => updateMenuPositionWithMeasuredWidth();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [open, updateMenuPositionWithMeasuredWidth]);
  // Close on outside click / Escape / outside scroll / resize.
  useEffect(() => {
    if (!open) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && menuRef.current && menuRef.current.contains(target)) {
        // Scroll happened inside the dropdown menu - keep it open.
        return;
      }
      setOpen(false);
    };
    const handleResize = () => {
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDownOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);
  const handleSelect = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      setOpen(false);
    },
    [onChange],
  );
  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        flexShrink: 0,
        display: "inline-flex",
        justifyContent: "flex-end",
        minWidth: 0,
        maxWidth: `${width}px`,
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        title={title || selected?.label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          width: `${width}px`,
          minWidth: `${width}px`,
          maxWidth: `${width}px`,
          height: "28px",
          padding: "2px 8px",
            background: "var(--bg-secondary)",
          border: open ? "1px solid var(--accent-color)" : "1px solid var(--border-color)",
          borderRadius: "4px",
          color: "var(--text-primary)",
          fontSize: "12px",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          opacity: disabled ? 0.5 : 1,
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!disabled && !open) {
            e.currentTarget.style.borderColor = "var(--accent-color)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !open) {
            e.currentTarget.style.borderColor = "var(--border-color)";
          }
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "left",
          }}
        >
          {selected?.label}
        </span>
        <span
          style={{
            flexShrink: 0,
            color: "var(--text-secondary)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <ChevronDown size={12} />
        </span>
      </button>
      {open && menuPosition && (
        <div
          ref={menuRef}
          className={instanceClass}
          role="listbox"
          style={{
            position: "fixed",
            zIndex: 9999,
            minWidth: `${menuMinWidth}px`,
            maxWidth: `${menuMaxWidth}px`,
            // Max height 150px; overflow scrolls. Scrollbar hidden via the
            // scoped style injected above.
            maxHeight: "150px",
            overflowY: "auto",
            overflowX: "hidden",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "4px",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.28)",
            padding: "4px 0",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            top: menuPosition.top,
            left: menuPosition.left,
            visibility: menuPosition.ready ? "visible" : "hidden",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                title={opt.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  color: isSelected ? "var(--accent-color)" : "var(--text-primary)",
                  background: isSelected ? "rgba(0, 150, 255, 0.08)" : "transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "left",
                  }}
                >
                  {opt.label}
                </span>
                {opt.subLabel && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "10px",
                      color: isSelected ? "var(--accent-color)" : "var(--text-tertiary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {opt.subLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default CommonDropdown;