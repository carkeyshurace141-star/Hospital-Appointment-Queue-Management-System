import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: 'Overview',
    body: `This policy explains what information MediQueue collects when you create an
      account and use the service, and how that information is used and protected.`,
  },
  {
    title: 'Information we collect',
    body: `When you register, we collect your full name, email address, and phone number.
      If you sign up with a password, we never store the password itself - only a
      one-way bcrypt hash of it. If you continue with Google, we receive your name and
      email address from Google to create or match your account; we never see your
      Google password.`,
  },
  {
    title: 'How we use your information',
    body: `Your information is used to create and authenticate your account, to identify
      you within the appointment and queue system, and to contact you about your
      appointments. We do not sell your information or share it with third parties for
      marketing purposes.`,
  },
  {
    title: 'Cookies and local storage',
    body: `MediQueue stores a signed session token in your browser's local storage to keep
      you signed in between visits. We do not use third-party advertising or tracking
      cookies.`,
  },
  {
    title: 'Data retention and security',
    body: `Passwords are hashed with bcrypt before storage. Account data is retained for as
      long as your account is active. You can request deletion of your account and
      associated data at any time by contacting us.`,
  },
  {
    title: 'Your rights',
    body: `You can request a copy of the personal data we hold about you, ask us to correct
      it, or ask us to delete your account. To make a request, use the details on our
      Contact page.`,
  },
  {
    title: 'Changes to this policy',
    body: `If this policy changes, the "last updated" date below will change accordingly.
      Material changes will be communicated to registered users.`,
  },
];

function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Last updated: July 2026</p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
              {section.title}
            </h2>
            <p className="mt-2 text-stone-600 dark:text-stone-400">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-10 text-stone-600 dark:text-stone-400">
        Questions about this policy?{' '}
        <Link
          to="/contact"
          className="font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}

export default PrivacyPolicyPage;
