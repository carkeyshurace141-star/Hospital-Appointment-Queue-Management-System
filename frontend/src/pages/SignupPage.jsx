import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { signup, googleLogin } from '../services/authService';
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
} from '../utils/validators';

const INITIAL_VALUES = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

function validateAll(values) {
  return {
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    password: validatePassword(values.password),
    confirmPassword: validateConfirmPassword(values.password, values.confirmPassword),
  };
}

function SignupPage() {
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
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true });
    if (!isValid) return;

    setServerError('');
    setIsSubmitting(true);
    try {
      const data = await signup(values);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setServerError('');
      try {
        const data = await googleLogin(credential);
        login(data.token, data.user);
        navigate('/dashboard');
      } catch (err) {
        setServerError(err.message);
      }
    },
    [login, navigate],
  );

  const handleGoogleError = useCallback((message) => {
    setServerError(message);
  }, []);

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-stone-100 px-4 py-12 dark:bg-stone-900 sm:px-6">
      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Create your account</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Sign up to book appointments and track your place in the queue.
        </p>

        <div className="mt-6">
          <GoogleButton onCredential={handleGoogleCredential} onError={handleGoogleError} />
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200 dark:border-stone-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-stone-500 dark:bg-stone-950 dark:text-stone-400">
              or continue with email
            </span>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <FormField
            id="name"
            label="Full name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="name"
            error={touched.name ? errors.name : ''}
          />
          <FormField
            id="email"
            label="Email address"
            type="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="email"
            error={touched.email ? errors.email : ''}
          />
          <FormField
            id="phone"
            label="Phone number"
            type="tel"
            value={values.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="tel"
            error={touched.phone ? errors.phone : ''}
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="new-password"
            error={touched.password ? errors.password : ''}
          >
            <PasswordStrengthMeter password={values.password} />
          </FormField>
          <FormField
            id="confirmPassword"
            label="Confirm password"
            type="password"
            value={values.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="new-password"
            error={touched.confirmPassword ? errors.confirmPassword : ''}
          />

          {serverError ? (
            <p
              role="alert"
              aria-live="assertive"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {serverError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full rounded-md bg-teal-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
          >
            {isSubmitting ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
