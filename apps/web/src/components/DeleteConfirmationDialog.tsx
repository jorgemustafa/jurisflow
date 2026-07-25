import { Trash2, X } from "lucide-react";
import type { ReactNode } from "react";

type DeleteConfirmationDialogProps = {
  title: string;
  children: ReactNode;
  confirmText: string;
  value: string;
  error?: string;
  isDeleting: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmationDialog({
  title,
  children,
  confirmText,
  value,
  error,
  isDeleting,
  onChange,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const canDelete = value === confirmText && !isDeleting;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <header className="dialog-header">
          <h2 id="delete-dialog-title">{title}</h2>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        <label className="confirm-field">
          Digite {confirmText} para confirmar
          <input autoFocus value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
        {error ? <p className="alert">{error}</p> : null}
        <footer className="dialog-actions">
          <button className="button" type="button" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </button>
          <button className="button danger" type="button" onClick={onConfirm} disabled={!canDelete}>
            <Trash2 size={18} />
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        </footer>
      </section>
    </div>
  );
}
