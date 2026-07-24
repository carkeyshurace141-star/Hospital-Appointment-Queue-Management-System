const CHANNELS = [
  {
    label: 'Email support',
    value: 'support@mediqueue.example',
    href: 'mailto:support@mediqueue.example',
  },
  {
    label: 'Phone',
    value: '+1 (555) 010-0143',
    href: 'tel:+15550100143',
  },
  {
    label: 'Support hours',
    value: 'Monday – Friday, 9:00 AM – 5:00 PM',
    href: null,
  },
];

function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
        Contact us
      </h1>
      <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">
        Questions about your account, a booking, or this project? Reach out through any of the
        channels below.
      </p>

      <dl className="mt-8 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-950">
        {CHANNELS.map((channel) => (
          <div key={channel.label} className="flex flex-col gap-1 p-5 sm:flex-row sm:gap-6">
            <dt className="w-40 shrink-0 text-sm font-semibold text-stone-500 dark:text-stone-400">
              {channel.label}
            </dt>
            <dd className="text-stone-900 dark:text-white">
              {channel.href ? (
                <a href={channel.href} className="text-teal-700 hover:underline dark:text-teal-400">
                  {channel.value}
                </a>
              ) : (
                channel.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 rounded-lg border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200">
        <strong className="font-semibold">Medical emergency?</strong> MediQueue is an appointment
        and queue management tool, not an emergency or triage service. If you need urgent medical
        attention, contact your local emergency services or go directly to your nearest emergency
        department.
      </div>
    </div>
  );
}

export default ContactPage;
