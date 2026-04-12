import { Modal } from './Modal.js';
import { Button } from './Button.js';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
