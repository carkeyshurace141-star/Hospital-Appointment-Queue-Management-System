import { CATEGORY_OPTIONS } from '../utils/categories';

function CategorySelector({ name = 'category', value, onChange, onBlur, error }) {
  const errorId = `${name}-error`;

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        Patient category
      </legend>
      <div
        className="mt-2 space-y-2"
        role="radiogroup"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      >
        {CATEGORY_OPTIONS.map((option) => (
          <label
            key={option.value}
            htmlFor={`${name}-${option.value}`}
            aria-label={option.label}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              value === option.value
                ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950'
                : 'border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-900'
            }`}
          >
            <input
              id={`${name}-${option.value}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              onBlur={onBlur}
              className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500"
            />
            <span>
              <span className="block font-medium text-stone-900 dark:text-white">
                {option.label}
              </span>
              <span className="block text-sm text-stone-600 dark:text-stone-400">
                {option.description}
              </span>
            </span>
          </label>
        ))}
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
    </fieldset>
  );
}

export default CategorySelector;
