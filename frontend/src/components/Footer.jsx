import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-stone-500 dark:text-stone-400 sm:flex-row sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} MediQueue. All rights reserved.</p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link
            to="/about"
            className="transition-colors hover:text-teal-700 dark:hover:text-teal-400"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="transition-colors hover:text-teal-700 dark:hover:text-teal-400"
          >
            Contact
          </Link>
          <Link
            to="/privacy-policy"
            className="transition-colors hover:text-teal-700 dark:hover:text-teal-400"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
