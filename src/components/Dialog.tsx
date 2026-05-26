import React, { useEffect, useState, useCallback } from "react";

export enum DialogType {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
}

interface DialogState {
  visible: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

let dialogController: {
  show: (
    type: DialogType,
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string,
  ) => void;
  hide: () => void;
  confirm: () => void;
  cancel: () => void;
} | null = null;

const Dialog: React.FC = () => {
  const [dialog, setDialog] = useState<DialogState>({
    visible: false,
    type: DialogType.INFO,
    title: "",
    message: "",
    confirmText: "确定",
    cancelText: "取消",
  });

  useEffect(() => {
    dialogController = {
      show: (
        type: DialogType,
        title: string,
        message: string,
        onConfirm?: () => void,
        onCancel?: () => void,
        confirmText: string = "确定",
        cancelText: string = "取消",
      ) => {
        setDialog({
          visible: true,
          type,
          title,
          message,
          onConfirm,
          onCancel,
          confirmText,
          cancelText,
        });
      },
      hide: () => {
        setDialog((prev) => ({ ...prev, visible: false }));
      },
      confirm: () => {
        if (dialog.onConfirm) {
          dialog.onConfirm();
        }
        setDialog((prev) => ({ ...prev, visible: false }));
      },
      cancel: () => {
        if (dialog.onCancel) {
          dialog.onCancel();
        }
        setDialog((prev) => ({ ...prev, visible: false }));
      },
    };

    return () => {
      dialogController = null;
    };
  }, [dialog.onConfirm, dialog.onCancel]);

  const handleConfirm = useCallback(() => {
    if (dialog.onConfirm) {
      dialog.onConfirm();
    }
    setDialog((prev) => ({ ...prev, visible: false }));
  }, [dialog.onConfirm]);

  const handleCancel = useCallback(() => {
    if (dialog.onCancel) {
      dialog.onCancel();
    }
    setDialog((prev) => ({ ...prev, visible: false }));
  }, [dialog.onCancel]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      return;
    }
  };

  const getIcon = (type: DialogType) => {
    switch (type) {
      case DialogType.SUCCESS:
        return "✓";
      case DialogType.WARNING:
        return "⚠";
      case DialogType.ERROR:
        return "✗";
      default:
        return "ℹ";
    }
  };

  const getColor = (type: DialogType) => {
    switch (type) {
      case DialogType.SUCCESS:
        return "#10b981";
      case DialogType.WARNING:
        return "#f59e0b";
      case DialogType.ERROR:
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };

  if (!dialog.visible) return null;

  return (
    <>
      <style>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 20000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 120px;
          animation: dialogFadeIn 0.2s ease-out;
        }
        @keyframes dialogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .dialog-container {
          min-width: 280px;
          max-width: 400px;
          width: auto;
          background: var(--bg-secondary, #1e1e2e);
          border-radius: 10px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          animation: dialogSlideDown 0.2s ease-out;
        }
        @keyframes dialogSlideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dialog-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 0 16px;
        }
        .dialog-icon {
          font-size: 18px;
          font-weight: bold;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.1);
        }
        .dialog-title {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary, #e0e0e0);
          margin: 0;
        }
        .dialog-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-secondary, #a0a0a0);
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .dialog-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary, #ffffff);
        }
        .dialog-message {
          padding: 14px 16px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary, #c0c0c0);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .dialog-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 0 16px 14px 16px;
        }
        .dialog-btn {
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-weight: 500;
        }
        .dialog-btn-cancel {
          background: transparent;
          border: 1px solid var(--border-color, #3a3a4a);
          color: var(--text-secondary, #c0c0c0);
        }
        .dialog-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary, #ffffff);
        }
        .dialog-btn-confirm {
          background: #3b82f6;
          color: white;
        }
        .dialog-btn-confirm:hover {
          background: #2563eb;
        }
        .dialog-warning .dialog-btn-confirm {
          background: #f59e0b;
        }
        .dialog-warning .dialog-btn-confirm:hover {
          background: #d97706;
        }
        .dialog-error .dialog-btn-confirm {
          background: #ef4444;
        }
        .dialog-error .dialog-btn-confirm:hover {
          background: #dc2626;
        }
        .dialog-success .dialog-btn-confirm {
          background: #10b981;
        }
        .dialog-success .dialog-btn-confirm:hover {
          background: #059669;
        }
      `}</style>
      <div className="dialog-overlay" onClick={handleOverlayClick}>
        <div className={`dialog-container dialog-${dialog.type}`}>
          <div className="dialog-header">
            <div
              className="dialog-icon"
              style={{
                color: getColor(dialog.type),
                borderColor: getColor(dialog.type),
              }}
            >
              {getIcon(dialog.type)}
            </div>
            <h3 className="dialog-title">{dialog.title}</h3>
            <button className="dialog-close" onClick={handleCancel}>
              ×
            </button>
          </div>
          <div className="dialog-message">{dialog.message}</div>
          <div className="dialog-buttons">
            <button
              className="dialog-btn dialog-btn-cancel"
              onClick={handleCancel}
            >
              {dialog.cancelText}
            </button>
            <button
              className="dialog-btn dialog-btn-confirm"
              onClick={handleConfirm}
            >
              {dialog.confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export const showDialog = (
  type: DialogType,
  title: string,
  message: string,
  onConfirm?: () => void,
  onCancel?: () => void,
  confirmText: string = "确定",
  cancelText: string = "取消",
) => {
  if (dialogController) {
    dialogController.show(
      type,
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
    );
  } else {
    console.warn("Dialog component not mounted yet");
  }
};

export const hideDialog = () => {
  if (dialogController) {
    dialogController.hide();
  }
};

export default Dialog;
