import { useAuth } from '../../context/AuthContext.jsx';

function DoctorDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Welcome, Dr. {user?.name}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          This is a placeholder clinician dashboard. Live queue management (Call / Skip / Recall /
          Complete / Refer / No-Show) will be added in a later build.
        </p>
      </div>
    </div>
  );
}

export default DoctorDashboardPage;
