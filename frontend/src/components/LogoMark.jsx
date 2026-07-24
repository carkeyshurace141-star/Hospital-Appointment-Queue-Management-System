function LogoMark({ className = 'h-8 w-8 bg-teal-600 text-white', iconClassName = 'h-4 w-4' }) {
  return (
    <span className={`flex items-center justify-center rounded-md ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={iconClassName}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-7-4.35-9.5-8.5C.5 8.5 2.5 5 6 5c2 0 3.5 1.2 4 2.2C10.5 6.2 12 5 14 5c3.5 0 5.5 3.5 3.5 7.5C15 16.65 12 21 12 21Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2l1.5-3L13 15l1.5-3H16" />
      </svg>
    </span>
  );
}

export default LogoMark;
