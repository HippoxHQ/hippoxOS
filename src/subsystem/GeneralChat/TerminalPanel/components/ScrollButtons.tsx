import React from "react";
import { styles } from "../constants";

interface ScrollButtonsProps {
  showScrollTop: boolean;
  showScrollBottom: boolean;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
}

export const ScrollButtons: React.FC<ScrollButtonsProps> = ({ showScrollTop, showScrollBottom, onScrollToTop, onScrollToBottom }) => {
  return (
    <div style={styles.scrollButtonsContainer}>
      {showScrollTop && (
        <button
          style={styles.scrollButton}
          onClick={onScrollToTop}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg, #3d3d3d)";
            e.currentTarget.style.color = "var(--text-primary, #fff)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary, #2d2d2d)";
            e.currentTarget.style.color = "var(--text-secondary, #aaa)";
          }}
        >
          ▲
        </button>
      )}
      {showScrollBottom && (
        <button
          style={styles.scrollButton}
          onClick={onScrollToBottom}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg, #3d3d3d)";
            e.currentTarget.style.color = "var(--text-primary, #fff)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary, #2d2d2d)";
            e.currentTarget.style.color = "var(--text-secondary, #aaa)";
          }}
        >
          ▼
        </button>
      )}
    </div>
  );
};
