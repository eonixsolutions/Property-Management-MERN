import type { ReactNode } from 'react';
import { sh } from '@/styles/shared';

interface Props {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  isLoading?: boolean;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirmation dialog (used for delete/destructive actions).
 * The confirm button is red (danger) by default.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  isLoading = false,
  isDanger = true,
  onConfirm,
  onCancel,
}: Props) {
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <div style={sh.overlay} onClick={handleOverlayClick}>
      <div style={{ ...sh.modal, width: '420px', padding: '1.5rem' }}>
        <h2 style={{ ...sh.modalTitle, marginBottom: '0.75rem' }}>{title}</h2>
        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={sh.modalActions}>
          <button style={sh.cancelBtn} type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button
            style={{
              ...(isDanger ? sh.dangerBtn : sh.submitBtn),
              ...(isLoading ? sh.submitBtnDisabled : {}),
            }}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
