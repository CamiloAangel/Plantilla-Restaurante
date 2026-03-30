interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  productName: string;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  productName,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] bg-black/55 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-stone-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-black text-black mb-2 uppercase tracking-tight">Confirmar eliminación</h3>
          <p className="text-sm text-stone-700">
            ¿Seguro que deseas eliminar <span className="font-black">{productName}</span>? Esta acción no se puede deshacer.
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-black text-sm hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
