import { useEffect, useRef } from 'react';

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
  children,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-stone-900"
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-stone-900 dark:text-white"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{message}</p>

        {children}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
          >
            {isConfirming ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
