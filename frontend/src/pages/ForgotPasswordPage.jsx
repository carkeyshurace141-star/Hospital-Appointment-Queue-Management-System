import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { forgotPassword } from '../services/authService';
import { validateEmail } from '../utils/validators';

const CONFIRMATION_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password.";

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const emailError = validateEmail(email);

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    if (emailError) return;

    setServerError('');
    setIsSubmitting(true);
    try {
      // The backend always returns the same generic response whether or
      // not the email exists, so success here never confirms an account.
      await forgotPassword({ email });
      setIsSubmitted(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-stone-100 px-4 py-12 dark:bg-stone-900 sm:px-6">
      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>

        {isSubmitted ? (
          <p role="status" aria-live="polite" className="mt-6 text-sm text-stone-700 dark:text-stone-300">
            {CONFIRMATION_MESSAGE}
          </p>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <FormField
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              autoComplete="email"
              error={touched ? emailError : ''}
            />

            {serverError ? (
              <p role="alert" aria-live="assertive" className="text-sm text-red-600 dark:text-red-400">
                {serverError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-teal-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
