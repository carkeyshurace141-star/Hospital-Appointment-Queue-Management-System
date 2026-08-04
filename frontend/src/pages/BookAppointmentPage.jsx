import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import SelectField from '../components/SelectField.jsx';
import CategorySelector from '../components/CategorySelector.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listDepartments, listDoctorsForDepartment } from '../services/departmentService';
import { createAppointment } from '../services/appointmentService';
import { categoryLabel } from '../utils/categories';

const STEPS = ['department', 'doctor', 'timeSlot', 'category', 'confirm'];
const STEP_TITLES = {
  department: 'Choose a department',
  doctor: 'Choose a doctor',
  timeSlot: 'Choose a date and time',
  category: 'Select your patient category',
  confirm: 'Review and confirm',
};

const INITIAL_VALUES = { department: '', doctor: '', timeSlot: '', category: '' };

function BookAppointmentPage() {
  const { token } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    listDepartments()
      .then((data) => setDepartments(data.departments))
      .catch((err) => setLoadError(err.message))
      .finally(() => setIsLoadingDepartments(false));
  }, []);

  useEffect(() => {
    if (!values.department) {
      setDoctors([]);
      return;
    }
    setIsLoadingDoctors(true);
    listDoctorsForDepartment(values.department)
      .then((data) => setDoctors(data.doctors))
      .catch((err) => setServerError(err.message))
      .finally(() => setIsLoadingDoctors(false));
  }, [values.department]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'department' ? { doctor: '' } : {}),
    }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function errorForStep(currentStep) {
    if (currentStep === 'department') {
      return values.department ? '' : 'Please select a department.';
    }
    if (currentStep === 'timeSlot') {
      if (!values.timeSlot) return 'Please choose a date and time.';
      if (new Date(values.timeSlot).getTime() <= Date.now()) {
        return 'Time slot must be in the future.';
      }
      return '';
    }
    if (currentStep === 'category') {
      return values.category ? '' : 'Please select a patient category.';
    }
    return '';
  }

  function goNext() {
    setTouched((prev) => ({ ...prev, [step]: true }));
    if (errorForStep(step)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    setServerError('');
    setIsSubmitting(true);
    try {
      const data = await createAppointment(
        {
          department: values.department,
          doctor: values.doctor,
          category: values.category,
          timeSlot: new Date(values.timeSlot).toISOString(),
        },
        token,
      );
      setBooked(data.appointment);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedDepartment = departments.find((d) => d.id === values.department);
  const selectedDoctor = doctors.find((d) => d.id === values.doctor);

  if (booked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950 sm:p-8">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
            Appointment booked
          </h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            Your appointment has been booked for{' '}
            {new Date(booked.timeSlot).toLocaleString()} in {booked.department?.name}.
            {booked.doctor?.name ? ` You have been assigned to ${booked.doctor.name}.` : ''}
          </p>
          <div className="mt-6 flex justify-between text-sm">
            <Link to="/dashboard" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              Back to dashboard
            </Link>
            <Link to="/check-in" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              Go to check-in
            </Link>
          </div>
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
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900 dark:text-white">
          {STEP_TITLES[step]}
        </h1>

        {loadError ? (
          <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        ) : null}

        <div className="mt-6 space-y-5">
          {step === 'department' ? (
            <SelectField
              id="department"
              label="Department"
              placeholder="Select a department"
              value={values.department}
              onChange={handleChange}
              onBlur={handleBlur}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              error={touched.department ? errorForStep('department') : ''}
            />
          ) : null}

          {step === 'doctor' ? (
            <SelectField
              id="doctor"
              label="Doctor (optional)"
              placeholder="No preference"
              value={values.doctor}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoadingDoctors}
              options={doctors.map((d) => ({
                value: d.id,
                label: d.specialization ? `${d.name} - ${d.specialization}` : d.name,
              }))}
            />
          ) : null}

          {step === 'timeSlot' ? (
            <FormField
              id="timeSlot"
              label="Date and time"
              type="datetime-local"
              value={values.timeSlot}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.timeSlot ? errorForStep('timeSlot') : ''}
            />
          ) : null}

          {step === 'category' ? (
            <CategorySelector
              name="category"
              value={values.category}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.category ? errorForStep('category') : ''}
            />
          ) : null}

          {step === 'confirm' ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-stone-200 pb-2 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">Department</dt>
                <dd className="font-medium text-stone-900 dark:text-white">
                  {selectedDepartment?.name}
                </dd>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">Doctor</dt>
                <dd className="font-medium text-stone-900 dark:text-white">
                  {selectedDoctor?.name || 'No preference'}
                </dd>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">Date and time</dt>
                <dd className="font-medium text-stone-900 dark:text-white">
                  {values.timeSlot ? new Date(values.timeSlot).toLocaleString() : ''}
                </dd>
              </div>
              <div className="flex justify-between pb-2">
                <dt className="text-stone-500 dark:text-stone-400">Category</dt>
                <dd className="font-medium text-stone-900 dark:text-white">
                  {categoryLabel(values.category)}
                </dd>
              </div>
            </dl>
          ) : null}

          {serverError ? (
            <p role="alert" aria-live="assertive" className="text-sm text-red-600 dark:text-red-400">
              {serverError}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back
          </button>

          {step === 'confirm' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-teal-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
            >
              {isSubmitting ? 'Booking…' : 'Confirm booking'}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-teal-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookAppointmentPage;
