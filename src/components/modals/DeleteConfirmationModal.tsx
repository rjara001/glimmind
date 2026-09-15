import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 bg-rose-600 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-2xl font-black">Eliminar mazo</h2>
          </div>
          <p className="text-rose-100 font-medium">Esta acción no se puede deshacer.</p>
        </div>

        <div className="p-8 bg-slate-50" style={{ scrollbarWidth: 'none' }}>
          <p className="text-slate-700 mb-6">
            ¿Estás seguro de que quieres eliminar <span className="font-bold text-rose-600">"{itemName}"</span>?
            Se eliminarán todas sus tarjetas permanentemente.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-[2] bg-rose-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-rose-700 disabled:bg-slate-300 disabled:shadow-none transition active:scale-95"
            >
              {isLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};