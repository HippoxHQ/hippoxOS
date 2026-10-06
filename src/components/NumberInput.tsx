import { Minus, Plus } from "lucide-react";

/**
 * NumberInput
 */
export interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
  autoWidth?: boolean;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
  align?: "left" | "center" | "right";
}
export const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, onBlur, min, max, step = 1, width = 80, autoWidth = false, disabled, placeholder, title, align = "left" }) => {
  /** Clamp a numeric value to the [min, max] range when provided. */
  const clamp = (n: number): number => {
    let v = n;
    if (typeof min === "number" && v < min) v = min;
    if (typeof max === "number" && v > max) v = max;
    return v;
  };
  const bump = (delta: number) => {
    if (disabled) return;
    const current = parseFloat(value);
    const base = isNaN(current) ? (typeof min === "number" ? min : 0) : current;
    const next = clamp(base + delta);
    onChange(String(next));
  };
  return (
    <div
      className="export-panel-number-input"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0",
        height: "24px",
        padding: "0",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-color)",
        borderRadius: "5px",
        width: autoWidth ? "100%" : `${width}px`,
        minWidth: autoWidth ? 0 : `${width}px`,
        maxWidth: autoWidth ? "none" : `${width}px`,
        boxSizing: "border-box",
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
      }}
      title={title}
    >
      <button
        type="button"
        className="number-input-step"
        onClick={() => bump(-step)}
        disabled={disabled}
        style={{
          width: "16px",
          height: "100%",
          border: "none",
          background: "transparent",
          color: "var(--text-tertiary)",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "11px",
          lineHeight: 1,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <Minus size={11} />
      </button>
      <input
        type="text"
        inputMode="decimal"
        className="number-input-field"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          height: "100%",
          border: "none",
          outline: "none",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          fontSize: "11px",
          textAlign: align,
          padding: "0 4px",
          fontVariantNumeric: "tabular-nums",
          borderRadius: "3px",
          boxShadow: "inset 0 0 0 1px var(--border-color)",
          boxSizing: "border-box",
        }}
      />
      <button
        type="button"
        className="number-input-step"
        onClick={() => bump(step)}
        disabled={disabled}
        style={{
          width: "16px",
          height: "100%",
          border: "none",
          background: "transparent",
          color: "var(--text-tertiary)",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "11px",
          lineHeight: 1,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <Plus size={11} />
      </button>
    </div>
  );
};
