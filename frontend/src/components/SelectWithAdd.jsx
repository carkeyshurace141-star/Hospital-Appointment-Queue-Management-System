import { useState } from 'react';
import SelectField from './SelectField.jsx';

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

// A <select> (see SelectField) plus a "+" button that reveals a small inline
// form for creating a brand new option on the fly - e.g. an admin picking a
// department/specialization that isn't in the seeded list yet.
function SelectWithAdd({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  options,
  placeholder,
  disabled = false,
  addLabel,
  onAdd,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [addError, setAddError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function startAdding() {
    setNewValue('');
    setAddError('');
    setIsAdding(true);
  }

  function cancelAdding() {
    setIsAdding(false);
    setAddError('');
  }

  async function handleAdd(event) {
    event.preventDefault();
    const trimmed = newValue.trim();
    if (trimmed.length < 2) {
      setAddError('Please enter at least 2 characters.');
      return;
    }

    setIsSaving(true);
    setAddError('');
    try {
      const created = await onAdd(trimmed);
      // Mimics a native <select> change event so the parent's existing
      // handleChange({ target: { name, value } }) keeps working unchanged.
      onChange({ target: { name: id, value: created.value } });
      setIsAdding(false);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <SelectField
            id={id}
            label={label}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            error={error}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={startAdding}
          disabled={disabled}
          aria-label={`Add new ${label.toLowerCase()}`}
          className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-md border border-stone-300 text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {isAdding ? (
        <form onSubmit={handleAdd} className="mt-2 flex items-start gap-2">
          <div className="flex-1">
            <label htmlFor={`${id}-new`} className="sr-only">
              {addLabel || `New ${label.toLowerCase()}`}
            </label>
            <input
              id={`${id}-new`}
              type="text"
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              placeholder={addLabel || `New ${label.toLowerCase()}`}
              aria-invalid={Boolean(addError)}
              className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
            />
            {addError ? (
              <p role="alert" aria-live="polite" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {addError}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={cancelAdding}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default SelectWithAdd;
