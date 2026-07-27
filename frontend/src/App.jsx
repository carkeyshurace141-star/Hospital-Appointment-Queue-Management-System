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
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AddDoctorPage from './pages/admin/AddDoctorPage.jsx';
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
