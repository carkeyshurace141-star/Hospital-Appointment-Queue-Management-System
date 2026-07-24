import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LogoMark from './LogoMark.jsx';
import ThemeToggle from './ThemeToggle.jsx';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6"
        aria-label="Primary"
      >
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-white"
        >
          <LogoMark />
          MediQueue
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-stone-600 dark:text-stone-400 sm:inline">
                Hi, {user?.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-stone-300 px-3.5 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-stone-700 hover:text-teal-700 dark:text-stone-300 dark:hover:text-teal-400"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
              >
                Sign Up
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
