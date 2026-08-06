import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { resetPassword } from '../services/authService';
import { validatePassword, validateConfirmPassword } from '../utils/validators';
import { homeRouteForRole } from '../utils/roles';

const INITIAL_VALUES = { newPassword: '', confirmPassword: '' };

function validateAll(values) {
  return {
    newPassword: validatePassword(values.newPassword),
    confirmPassword: validateConfirmPassword(values.newPassword, values.confirmPassword),
  };
}

function ResetPasswordPage() {
  const { token } = useParams();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const errors = validateAll(values);
  const isValid = Object.values(errors).every((e) => !e);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({ newPassword: true, confirmPassword: true });
    if (!isValid) return;

    setServerError('');
    setIsSubmitting(true);
    try {
      const data = await resetPassword({ token, newPassword: values.newPassword });
      login(data.token, data.user);
      navigate(homeRouteForRole(data.user.role), { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-stone-100 px-4 py-12 dark:bg-stone-900 sm:px-6">
      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Set a new password</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Choose a new password for your account.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <FormField
            id="newPassword"
            label="New password"
            type="password"
            value={values.newPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="new-password"
            error={touched.newPassword ? errors.newPassword : ''}
          >
            <PasswordStrengthMeter password={values.newPassword} />
          </FormField>
          <FormField
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            value={values.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="new-password"
            error={touched.confirmPassword ? errors.confirmPassword : ''}
          />

          {serverError ? (
            <div>
              <p role="alert" aria-live="assertive" className="text-sm text-red-600 dark:text-red-400">
                {serverError}
              </p>
              <Link
                to="/forgot-password"
                className="mt-1 inline-block text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                Request a new reset link
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full rounded-md bg-teal-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
