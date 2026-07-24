function getStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const LEVELS = [
  { label: 'Very weak', color: 'bg-red-500' },
  { label: 'Weak', color: 'bg-orange-500' },
  { label: 'Fair', color: 'bg-yellow-500' },
  { label: 'Good', color: 'bg-lime-500' },
  { label: 'Strong', color: 'bg-green-600' },
];

function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const score = getStrength(password);
  const level = LEVELS[Math.min(score, LEVELS.length - 1)];
  const percent = ((Math.min(score, LEVELS.length - 1) + 1) / LEVELS.length) * 100;

  return (
    <div className="mt-1" aria-live="polite">
      <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-700">
        <div
          className={`h-1.5 rounded-full transition-all ${level.color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
        Password strength: {level.label}
      </p>
    </div>
  );
}

export default PasswordStrengthMeter;
