import React from 'react';

type ModalProps = {
  title: string;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
};

export default function Modal({
  title,
  visible,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  children,
}: ModalProps) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="button danger" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
