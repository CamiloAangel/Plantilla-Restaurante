interface AlertMessageProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose?: () => void;
}

export function AlertMessage({ message, type, isVisible, onClose }: AlertMessageProps) {
  if (!isVisible) return null;

  return (
    <div
      className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
        type === 'error'
          ? 'bg-red-100 text-red-800'
          : type === 'success'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-blue-100 text-blue-800'
      }`}
    >
      <span className="material-symbols-outlined">
        {type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}
      </span>
      <p className="font-bold text-black">{message}</p>
      {onClose && (
        <button onClick={onClose} className="ml-auto text-current hover:opacity-70">
          <span className="material-symbols-outlined">close</span>
        </button>
      )}
    </div>
  );
}

export default AlertMessage;
