import React, { forwardRef } from "react";
import { SearchIcon, ClearIcon } from "../../../../icons";
import { X } from "lucide-react";
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder: string;
  isFocused: boolean;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ value, onChange, onClear, onClose, onFocus, onBlur, placeholder, isFocused, isDragging, onDragStart, inputRef }, ref) => {
  const handleInputRef = (el: HTMLInputElement | null) => {
    if (typeof ref === "function") {
      ref(el);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }
    if (inputRef) {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 12px",
        border: `1px solid ${isFocused ? "#0078d4" : "var(--border-color)"}`,
        background: "var(--bg-secondary)",
        height: "35px",
        marginBottom: "5px",
        borderRadius: "5px",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={onDragStart}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          color: "var(--text-secondary)",
          flexShrink: 0,
        }}
      >
        <SearchIcon />
      </span>
      <input
        ref={handleInputRef}
        type="text"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontSize: "13px",
          padding: "8px 0",
          marginLeft: "4px",
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        {value && (
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              borderRadius: "4px",
            }}
            onClick={onClear}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ClearIcon size={14} />
          </button>
        )}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "16px",
            borderRadius: "4px",
          }}
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
});
SearchInput.displayName = "SearchInput";
