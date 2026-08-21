import React from 'react';

/**
 * ConfirmDialog
 *
 * A custom-styled replacement for window.confirm(). Browsers always stamp
 * the site's actual domain into a native confirm() box (e.g. "vercel.app
 * says") for security reasons -- that can't be suppressed. This component
 * avoids that entirely by being a normal in-app modal instead.
 *
 * Usage:
 *   const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm } | null
 *   ...
 *   setConfirmAction({ message: '...', onConfirm: () => doTheThing() });
 *   ...
 *   {confirmAction && (
 *     <ConfirmDialog
 *       message={confirmAction.message}
 *       onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
 *       onCancel={() => setConfirmAction(null)}
 *     />
 *   )}
 */
export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
}) {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel} role="presentation">
      <div
        className="confirm-dialog-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="confirm-dialog-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        .confirm-dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 30, 15, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 20px;
        }

        .confirm-dialog-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 28px 24px 20px;
          max-width: 320px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .confirm-dialog-message {
          font-size: 15px;
          line-height: 1.5;
          color: #1a1a1a;
          margin: 0 0 20px;
          text-align: center;
        }

        .confirm-dialog-actions {
          display: flex;
          gap: 10px;
        }

        .confirm-dialog-cancel,
        .confirm-dialog-confirm {
          flex: 1;
          border: none;
          border-radius: 999px;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .confirm-dialog-cancel {
          background: #EEEEEE;
          color: #333333;
        }

        .confirm-dialog-cancel:hover {
          background: #E0E0E0;
        }

        .confirm-dialog-confirm {
          background: #B3261E;
          color: #FFFFFF;
        }

        .confirm-dialog-confirm:hover {
          background: #8F1E18;
        }
      `}</style>
    </div>
  );
}
