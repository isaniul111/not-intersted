import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Page Imports
import AdminSignup from './pages/admin/AdminSignup';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import MembersManagement from './pages/admin/MembersManagement';
import MealsManagement from './pages/admin/MealsManagement';
import PaymentsManagement from './pages/admin/PaymentsManagement';
import NoticesManagement from './pages/admin/NoticesManagement';
import ExpensesManagement from './pages/admin/ExpensesManagement';
import AdminSettings from './pages/admin/AdminSettings';

import MemberLogin from './pages/MemberLogin';
import MemberDashboard from './pages/member/MemberDashboard';
import MemberProfile from './pages/member/MemberProfile';
import MemberMeals from './pages/member/MemberMeals';
import MemberMealPreferences from './pages/member/MemberMealPreferences';
import MemberPayments from './pages/member/MemberPayments';
import MemberNotices from './pages/member/MemberNotices';


// RootRedirect Component
const RootRedirect = () => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Jodi user na thake, login e pathabo
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jodi user thake ebong pathname root ('/') hoy
  if (location.pathname === '/') {
    const lastPage = localStorage.getItem('lastVisitedPage');

    if (
      lastPage &&
      lastPage !== '/' &&
      lastPage !== '/login' &&
      lastPage !== '/admin/login'
    ) {
      return <Navigate to={lastPage} replace />;
    }

    // Kon last page na thakle role onujayi default dashboard
    return (
      <Navigate
        to={role === 'admin' ? '/admin/dashboard' : '/dashboard'}
        replace
      />
    );
  }

  return null;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Root Route */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth Routes */}
      <Route path="/admin/signup" element={<AdminSignup />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/login" element={<MemberLogin />} />

      {/* ==================== ADMIN PROTECTED ROUTES ==================== */}

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/members"
        element={
          <ProtectedRoute requiredRole="admin">
            <MembersManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/meals"
        element={
          <ProtectedRoute requiredRole="admin">
            <MealsManagement />
          </ProtectedRoute>
        }
      />

      {/* NEW: Admin Payments */}
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute requiredRole="admin">
            <PaymentsManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notices"
        element={
          <ProtectedRoute requiredRole="admin">
            <NoticesManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/expenses"
        element={
          <ProtectedRoute requiredRole="admin">
            <ExpensesManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminSettings />
          </ProtectedRoute>
        }
      />


      {/* ==================== MEMBER PROTECTED ROUTES ==================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="member">
            <MemberDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute requiredRole="member">
            <MemberProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/meals"
        element={
          <ProtectedRoute requiredRole="member">
            <MemberMeals />
          </ProtectedRoute>
        }
      />

      {/* NEW: Member Meal Preferences */}
      <Route
        path="/meal-preferences"
        element={
          <ProtectedRoute requiredRole="member">
            <MemberMealPreferences />
          </ProtectedRoute>
        }
      />

      {/* NEW: Member Payments */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute requiredRole="member">
            <MemberPayments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notices"
        element={
          <ProtectedRoute requiredRole="member">
            <MemberNotices />
          </ProtectedRoute>
        }
      />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;