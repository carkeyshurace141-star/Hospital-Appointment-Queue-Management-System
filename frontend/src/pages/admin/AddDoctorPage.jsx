import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../../components/FormField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { addDoctor } from '../../services/adminService';
import {
  validateName,
  validateEmail,
  validatePhone,
  validateSpecialization,
  validateDepartment,
} from '../../utils/validators';

const INITIAL_VALUES = { name: '', email: '', phone: '', specialization: '', department: '' };

function validateAll(values) {
  return {
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    specialization: validateSpecialization(values.specialization),
    department: validateDepartment(values.department),
  };
}

function AddDoctorPage() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const { token } = useAuth();

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
    setTouched({ name: true, email: true, phone: true, specialization: true, department: true });
    if (!isValid) return;

    setServerError('');
    setIsSubmitting(true);
    try {
      const data = await addDoctor(values, token);
      setResult(data);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    const text = `Email: ${result.doctor.email}\nTemporary password: ${result.temporaryPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Doctor account created</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Share these credentials with {result.doctor.name} securely. This password is shown only
            once and cannot be retrieved again.
          </p>

          <div className="mt-6 space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950">
            <p>
              <span className="font-medium text-stone-700 dark:text-stone-300">Email:</span>{' '}
              <span className="font-mono text-stone-900 dark:text-white">{result.doctor.email}</span>
            </p>
            <p>
              <span className="font-medium text-stone-700 dark:text-stone-300">Temporary password:</span>{' '}
              <span className="font-mono text-stone-900 dark:text-white">{result.temporaryPassword}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-4 w-full rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>

          <div className="mt-6 flex justify-between text-sm">
            <Link to="/admin" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              Back to dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setValues(INITIAL_VALUES);
                setTouched({});
                setCopied(false);
              }}
              className="font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              Add another doctor
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Add doctor</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          The system will generate login credentials automatically once you submit these details.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
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
            id="specialization"
            label="Specialization"
            value={values.specialization}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.specialization ? errors.specialization : ''}
          />
          <FormField
            id="department"
            label="Department"
            value={values.department}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.department ? errors.department : ''}
          />

          {serverError ? (
            <p role="alert" aria-live="assertive" className="text-sm text-red-600 dark:text-red-400">
              {serverError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full rounded-md bg-teal-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
          >
            {isSubmitting ? 'Creating account…' : 'Create doctor account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddDoctorPage;
