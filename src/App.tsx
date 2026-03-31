import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import AdminSignup from './pages/admin/AdminSignup';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import MembersManagement from './pages/admin/MembersManagement';
import MealsManagement from './pages/admin/MealsManagement';
import ExpensesManagement from './pages/admin/ExpensesManagement';
import NoticesManagement from './pages/admin/NoticesManagement';
import AdminSettings from './pages/admin/AdminSettings';

import MemberLogin from './pages/MemberLogin';
import MemberDashboard from './pages/member/MemberDashboard';
import MemberMeals from './pages/member/MemberMeals';
import MemberNotices from './pages/member/MemberNotices';
import MemberProfile from './pages/member/MemberProfile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
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
          <Route
            path="/admin/expenses"
            element={
              <ProtectedRoute requiredRole="admin">
                <ExpensesManagement />
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
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<MemberLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="member">
                <MemberDashboard />
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
          <Route
            path="/notices"
            element={
              <ProtectedRoute requiredRole="member">
                <MemberNotices />
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
