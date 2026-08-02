import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SelectField from '../components/SelectField.jsx';
import CategorySelector from '../components/CategorySelector.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listDepartments } from '../services/departmentService';
import { createWalkIn } from '../services/appointmentService';

const INITIAL_VALUES = { department: '', category: '' };

function validateAll(values) {
  return {
    department: values.department ? '' : 'Please select a department.',
    category: values.category ? '' : 'Please select a patient category.',
  };
}

function WalkInPage() {
  const { token } = useAuth();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const errors = validateAll(values);
  const isValid = Object.values(errors).every((e) => !e);

  useEffect(() => {
    listDepartments()
      .then((data) => setDepartments(data.departments))
      .catch((err) => setLoadError(err.message))
      .finally(() => setIsLoadingDepartments(false));
  }, []);

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
    setTouched({ department: true, category: true });
    if (!isValid) return;

    setServerError('');
    setIsSubmitting(true);
    try {
      const data = await createWalkIn(values, token);
      setResult(data);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">You&apos;re checked in</h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            You have been added to the queue in {result.appointment.department?.name}.
            {result.appointment.doctor?.name
              ? ` You have been assigned to ${result.appointment.doctor.name}.`
              : ''}
          </p>
          <div className="mt-6 rounded-md border border-teal-300 bg-teal-50 p-4 text-center dark:border-teal-700 dark:bg-teal-950">
            <p className="text-sm text-stone-600 dark:text-stone-400">Your token number</p>
            <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">{result.token}</p>
          </div>
          <Link
            to="/dashboard"
            className="mt-6 block text-center font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isLoadingDepartments) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <span
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-teal-600 dark:border-stone-700 dark:border-t-teal-400"
        />
        <p className="ml-3 text-stone-600 dark:text-stone-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Walk-in registration</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Register now and we&apos;ll add you to the queue right away.
        </p>

        {loadError ? (
          <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <SelectField
            id="department"
            label="Department"
            placeholder="Select a department"
            value={values.department}
            onChange={handleChange}
            onBlur={handleBlur}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            error={touched.department ? errors.department : ''}
          />

          <CategorySelector
            name="category"
            value={values.category}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.category ? errors.category : ''}
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
            {isSubmitting ? 'Registering…' : 'Confirm walk-in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default WalkInPage;
