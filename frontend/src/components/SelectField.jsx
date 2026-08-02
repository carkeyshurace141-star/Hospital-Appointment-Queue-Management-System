function SelectField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  options,
  placeholder,
  disabled = false,
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <div className="relative mt-1">
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-md border bg-white px-3 py-2 text-stone-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-stone-100 dark:bg-stone-900 dark:text-white dark:disabled:bg-stone-800 ${
            error ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-700'
          }`}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-1 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default SelectField;
