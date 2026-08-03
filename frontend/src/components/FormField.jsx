import { useState } from 'react';

function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
      />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.36 5.11A9.99 9.99 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.22 4.19M6.6 6.6C4.24 8.2 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3.4-.6"
      />
    </svg>
  );
}

function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  children,
}) {
  const errorId = `${id}-error`;
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={id}
          type={isPassword && showPassword ? 'text' : type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-md border bg-white px-3 py-2 text-stone-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-stone-900 dark:text-white dark:placeholder:text-stone-500 ${
            isPassword ? 'pr-10' : ''
          } ${error ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-700'}`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        ) : null}
      </div>
      {children}
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

export default FormField;
