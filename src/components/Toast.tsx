import React, { useEffect, useState } from "react";

export enum ToastType {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
}

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  timeoutId?: NodeJS.Timeout;
}

let toastContainer: {
  addToast: (type: ToastType, message: string) => void;
} | null = null;

const Toast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastContainer = {
      addToast: (type: ToastType, message: string) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        setToasts((prev) => {
          const newToasts = [...prev, { id, type, message }];
          if (newToasts.length > 10) {
            const removed = newToasts.shift();
            if (removed?.timeoutId) clearTimeout(removed.timeoutId);
          }
          return newToasts;
        });

        const timeoutId = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);

        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, timeoutId } : t)),
        );
      },
    };

    return () => {
      toastContainer = null;
      toasts.forEach((toast) => {
        if (toast.timeoutId) clearTimeout(toast.timeoutId);
      });
    };
  }, []);

  const handleClose = (id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast?.timeoutId) clearTimeout(toast.timeoutId);
      return prev.filter((t) => t.id !== id);
    });
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case ToastType.SUCCESS:
        return "✓";
      case ToastType.WARNING:
        return "⚠";
      case ToastType.ERROR:
        return "✗";
      default:
        return "ℹ";
    }
  };

  const getGlowColor = (type: ToastType) => {
    switch (type) {
      case ToastType.SUCCESS:
        return "rgba(16, 185, 129, 0.5)";
      case ToastType.WARNING:
        return "rgba(245, 158, 11, 0.5)";
      case ToastType.ERROR:
        return "rgba(239, 68, 68, 0.5)";
      default:
        return "rgba(59, 130, 246, 0.5)";
    }
  };

  const getIconBgColor = (type: ToastType) => {
    switch (type) {
      case ToastType.SUCCESS:
        return "rgba(16, 185, 129, 0.15)";
      case ToastType.WARNING:
        return "rgba(245, 158, 11, 0.15)";
      case ToastType.ERROR:
        return "rgba(239, 68, 68, 0.15)";
      default:
        return "rgba(59, 130, 246, 0.15)";
    }
  };

  const getIconColor = (type: ToastType) => {
    switch (type) {
      case ToastType.SUCCESS:
        return "#10b981";
      case ToastType.WARNING:
        return "#f59e0b";
      case ToastType.ERROR:
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };
  if (toasts.length === 0) return null;
  return (
    <>
      <style>{`
        .toast-container {
          position: fixed;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          pointer-events: none;
        }
        .toast-item {
          min-width: 300px;
          max-width: 480px;
          background: var(--bg-secondary, rgba(30, 30, 46, 0.95));
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 10px 15px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05);
          pointer-events: auto;
          animation: toastSlideIn 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
          transition: all 0.2s ease;
        }
        .toast-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes toastGlowPulse {
          0% {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05);
          }
          50% {
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(59, 130, 246, 0.3);
          }
          100% {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05);
          }
        }
        .toast-icon-wrapper {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .toast-icon {
          font-size: 18px;
          font-weight: 600;
        }
        .toast-message {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #e0e0e0);
          line-height: 1.5;
          word-break: break-word;
          letter-spacing: 0.3px;
        }
        .toast-close {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          color: var(--text-secondary, #a0a0a0);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .toast-close:hover {
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-primary, #ffffff);
          transform: scale(1.05);
        }
        .toast-success {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(16, 185, 129, 0.3);
        }
        .toast-success:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(16, 185, 129, 0.4);
        }
        .toast-warning {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(245, 158, 11, 0.3);
        }
        .toast-warning:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(245, 158, 11, 0.4);
        }
        .toast-error {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.3);
        }
        .toast-error:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(239, 68, 68, 0.4);
        }
        .toast-info {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.3);
        }
        .toast-info:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(59, 130, 246, 0.4);
        }
      `}</style>
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <div
              className="toast-icon-wrapper"
              style={{ background: getIconBgColor(toast.type) }}
            >
              <div
                className="toast-icon"
                style={{ color: getIconColor(toast.type) }}
              >
                {getIcon(toast.type)}
              </div>
            </div>
            <div className="toast-message">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => handleClose(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export const showToast = (type: ToastType, message: string) => {
  if (toastContainer) {
    toastContainer.addToast(type, message);
  } else {
    console.warn("Toast component not mounted yet");
  }
};

export default Toast;
