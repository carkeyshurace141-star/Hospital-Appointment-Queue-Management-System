import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DevSocketListener from './components/DevSocketListener.jsx';
import LandingPage from './pages/LandingPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BookAppointmentPage from './pages/BookAppointmentPage.jsx';
import WalkInPage from './pages/WalkInPage.jsx';
import CheckInPage from './pages/CheckInPage.jsx';
import QueueStatusPage from './pages/QueueStatusPage.jsx';
import NowServingPage from './pages/NowServingPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AddDoctorPage from './pages/admin/AddDoctorPage.jsx';
import AuditLogPage from './pages/admin/AuditLogPage.jsx';
import ReportsPage from './pages/admin/ReportsPage.jsx';
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['patient']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book-appointment"
              element={
                <ProtectedRoute roles={['patient']}>
                  <BookAppointmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/walk-in"
              element={
                <ProtectedRoute roles={['patient']}>
                  <WalkInPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/check-in"
              element={
                <ProtectedRoute roles={['patient']}>
                  <CheckInPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/queue-status"
              element={
                <ProtectedRoute roles={['patient']}>
                  <QueueStatusPage />
                </ProtectedRoute>
              }
            />
            <Route path="/now-serving" element={<NowServingPage />} />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/doctors/new"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AddDoctorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute roles={['admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor"
              element={
                <ProtectedRoute roles={['doctor']}>
                  <DoctorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
        <DevSocketListener />
      </div>
    </ErrorBoundary>
  );
}

export default App;
