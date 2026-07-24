const STEPS = [
  {
    title: 'Register',
    body: 'Create a free account with your name, email, and phone number.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"
      />
    ),
  },
  {
    title: 'Book or walk in',
    body: 'Request an appointment online, or check in when you arrive at the hospital.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v4M16 2v4M3.5 9h17M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM8 14h2M14 14h2M8 17h2M14 17h2"
      />
    ),
  },
  {
    title: 'Get your queue position',
    body: 'See exactly where you stand in line and roughly how long the wait will be.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z"
      />
    ),
  },
  {
    title: 'Get seen',
    body: "We'll notify you when it's your turn, so you're not stuck standing in a corridor.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />,
  },
];

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
    >
      {children}
    </svg>
  );
}

function AboutPage() {
  return (
    <div>
      <section className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            About MediQueue
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-600 dark:text-stone-400">
            MediQueue is a hospital appointment and queue management system built to make waiting
            rooms fairer and more predictable - for patients and for the clinics that run them.
          </p>
        </div>
      </section>

      <section className="bg-stone-100 dark:bg-stone-900">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
                Why this matters
              </h2>
              <p className="mt-3 max-w-lg text-stone-600 dark:text-stone-400">
                First-come-first-served sounds fair, but it isn't when a patient with an urgent
                condition arrives after someone in for a routine check-up. MediQueue is built as the
                foundation for smarter, priority-aware queuing - so clinical need, not just arrival
                time, can determine who's seen next.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  First-come-first-served
                </p>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  Urgent case waits behind routine check-ups just because they arrived later.
                </p>
              </div>
              <div className="rounded-lg border border-teal-200 bg-white p-4 dark:border-teal-800 dark:bg-stone-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
                  Priority-aware queuing
                </p>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  Clinical need helps determine order, not just who walked in first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-stone-950">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-white">How it works</h2>

          <div className="relative mt-12">
            <div
              aria-hidden="true"
              className="absolute top-5 right-5 left-5 hidden h-px bg-stone-200 dark:bg-stone-800 lg:block"
            />
            <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-teal-600 bg-white text-sm font-bold text-teal-700 dark:bg-stone-950 dark:text-teal-400">
                    {index + 1}
                  </div>
                  <span className="mt-3 inline-flex text-teal-700 dark:text-teal-400">
                    <Icon>{step.icon}</Icon>
                  </span>
                  <h3 className="mt-2 font-semibold text-stone-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
