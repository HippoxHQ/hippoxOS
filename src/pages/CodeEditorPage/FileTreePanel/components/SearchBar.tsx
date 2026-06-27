import React from "react";
import { CloseIcon, SearchIcon } from "../../../../icons";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (value: boolean) => void;
  clearSearch: () => void;
  t: (key: string) => string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  setIsSearchFocused,
  clearSearch,
  t,
}) => {
  return (
    <div
      style={{
        height: "41px",
        minHeight: "41px",
        padding: "6px 8px",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "29px",
          background: "var(--bg-tertiary)",
          borderRadius: "4px",
          border: `1px solid ${
            isSearchFocused ? "var(--accent-color)" : "var(--border-color)"
          }`,
          padding: "0 8px",
          transition: "border-color 0.15s ease",
        }}
      >
        <SearchIcon />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder={t("codeEditor.search") || "Search files..."}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "12px",
            padding: "4px 8px",
            height: "100%",
          }}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "18px",
              height: "18px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              borderRadius: "4px",
              padding: 0,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>
    </div>
  );
};