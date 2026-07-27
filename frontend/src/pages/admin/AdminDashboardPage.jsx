import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { listDoctors } from '../../services/adminService';

function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listDoctors(token)
      .then((data) => setDoctors(data.doctors))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Welcome, {user?.name}</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-400">Manage doctor accounts for the clinic.</p>
        </div>
        <Link
          to="/admin/doctors/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          + Add Doctor
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Specialization</th>
              <th className="px-4 py-3 font-medium">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-600 dark:text-red-400">
                  {error}
                </td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  No doctors yet. Add your first doctor to get started.
                </td>
              </tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td className="px-4 py-3 text-stone-900 dark:text-white">{doctor.name}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{doctor.email}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{doctor.specialization}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{doctor.department}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
