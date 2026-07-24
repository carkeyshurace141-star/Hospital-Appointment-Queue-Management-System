import { Link } from 'react-router-dom';

function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Reset your password</h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        Password reset isn&apos;t available yet — this flow is coming in a future update.
      </p>
      <Link
        to="/login"
        className="mt-6 font-medium text-teal-700 hover:underline dark:text-teal-400"
      >
        Back to log in
      </Link>
    </div>
  );
}

export default ForgotPasswordPage;
