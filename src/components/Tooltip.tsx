import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

interface TooltipProps {
  message: string;
  targetElement: HTMLElement;
  onClose: () => void;
}

const calculatePosition = (
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
): {
  top: number;
  left: number;
  arrowDirection: "top" | "bottom" | "left" | "right";
} => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const gap = 12;
  let rightSpace = viewportWidth - targetRect.right;
  let leftSpace = targetRect.left;
  let bottomSpace = viewportHeight - targetRect.bottom;
  if (rightSpace >= tooltipWidth + gap) {
    return {
      top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      left: targetRect.right + gap,
      arrowDirection: "left",
    };
  }
  if (leftSpace >= tooltipWidth + gap) {
    return {
      top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      left: targetRect.left - tooltipWidth - gap,
      arrowDirection: "right",
    };
  }
  if (bottomSpace >= tooltipHeight + gap) {
    return {
      top: targetRect.bottom + gap,
      left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
      arrowDirection: "top",
    };
  }
  return {
    top: targetRect.top - tooltipHeight - gap,
    left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
    arrowDirection: "bottom",
  };
};

const tooltipStyles = `
  .global-tooltip {
    position: fixed;
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-color);
    pointer-events: none;
    animation: tooltipFadeIn 0.15s ease;
  }

  .global-tooltip::before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
  }

  .global-tooltip.arrow-top::before {
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 6px 6px 6px;
    border-color: transparent transparent var(--border-color) transparent;
  }

  .global-tooltip.arrow-top::after {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 5px 5px 5px;
    border-style: solid;
    border-color: transparent transparent var(--bg-secondary) transparent;
  }

  .global-tooltip.arrow-bottom::before {
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px 6px 0 6px;
    border-color: var(--border-color) transparent transparent transparent;
  }

  .global-tooltip.arrow-bottom::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px 5px 0 5px;
    border-style: solid;
    border-color: var(--bg-secondary) transparent transparent transparent;
  }

  .global-tooltip.arrow-left::before {
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    border-width: 6px 6px 6px 0;
    border-color: transparent var(--border-color) transparent transparent;
  }

  .global-tooltip.arrow-left::after {
    content: '';
    position: absolute;
    left: -5px;
    top: 50%;
    transform: translateY(-50%);
    border-width: 5px 5px 5px 0;
    border-style: solid;
    border-color: transparent var(--bg-secondary) transparent transparent;
  }

  .global-tooltip.arrow-right::before {
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    border-width: 6px 0 6px 6px;
    border-color: transparent transparent transparent var(--border-color);
  }

  .global-tooltip.arrow-right::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
    border-width: 5px 0 5px 5px;
    border-style: solid;
    border-color: transparent transparent transparent var(--bg-secondary);
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

if (typeof document !== "undefined") {
  const styleId = "global-tooltip-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = tooltipStyles;
    document.head.appendChild(style);
  }
}

const TooltipComponent: React.FC<TooltipProps> = ({
  message,
  targetElement,
  onClose,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowDirection, setArrowDirection] = useState<
    "top" | "bottom" | "left" | "right"
  >("top");
  const tooltipRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tooltipRef.current || !targetElement) return;
    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const {
      top,
      left,
      arrowDirection: dir,
    } = calculatePosition(rect, tooltipRect.width, tooltipRect.height);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let finalTop = top;
    let finalLeft = left;
    if (finalLeft < 8) finalLeft = 8;
    if (finalLeft + tooltipRect.width > viewportWidth - 8) {
      finalLeft = viewportWidth - tooltipRect.width - 8;
    }
    if (finalTop < 8) finalTop = 8;
    if (finalTop + tooltipRect.height > viewportHeight - 8) {
      finalTop = viewportHeight - tooltipRect.height - 8;
    }
    setPosition({ top: finalTop, left: finalLeft });
    setArrowDirection(dir);
  }, [targetElement]);
  useEffect(() => {
    const handleScroll = () => onClose();
    const handleResize = () => onClose();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [onClose]);
  return (
    <div
      ref={tooltipRef}
      className={`global-tooltip arrow-${arrowDirection}`}
      style={{ top: position.top, left: position.left }}
    >
      {message}
    </div>
  );
};
let tooltipRoot: any = null;
let currentTooltipContainer: HTMLElement | null = null;
export const closeTooltip = () => {
  if (currentTooltipContainer) {
    const root = createRoot(currentTooltipContainer);
    root.unmount();
    currentTooltipContainer.remove();
    currentTooltipContainer = null;
  }
};

export const showTooltip = (message: string, targetElement: HTMLElement) => {
  closeTooltip();
  const containerId = "global-tooltip-container";
  let container = document.getElementById(containerId);
  if (container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  } else {
    container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
  }
  currentTooltipContainer = container;
  const onClose = () => {
    if (currentTooltipContainer) {
      const root = createRoot(currentTooltipContainer);
      root.unmount();
      currentTooltipContainer.remove();
      currentTooltipContainer = null;
    }
  };
  const root = createRoot(container);
  root.render(
    <TooltipComponent
      message={message}
      targetElement={targetElement}
      onClose={onClose}
    />,
  );
};

export const showTooltipOnElement = (
  element: HTMLElement | null,
  message: string,
) => {
  if (!element) return;
  showTooltip(message, element);
};

export const useTooltip = () => {
  return {
    showTooltip: (element: HTMLElement | null, message: string) => {
      if (element) {
        showTooltip(message, element);
      }
    },
  };
};

export default TooltipComponent;
