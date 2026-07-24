import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Page not found</h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="mt-6 font-medium text-teal-700 hover:underline dark:text-teal-400">
        Back to home
      </Link>
    </div>
  );
}

export default NotFoundPage;
