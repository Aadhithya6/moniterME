import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import AddFood from '@/pages/AddFood';
import AddWorkout from '@/pages/AddWorkout';
import Goals from '@/pages/Goals';
import History from '@/pages/History';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            }
          />
          <Route
            path="/add-food"
            element={
              <DashboardLayout>
                <AddFood />
              </DashboardLayout>
            }
          />
          <Route
            path="/add-workout"
            element={
              <DashboardLayout>
                <AddWorkout />
              </DashboardLayout>
            }
          />
          <Route
            path="/goals"
            element={
              <DashboardLayout>
                <Goals />
              </DashboardLayout>
            }
          />
          <Route
            path="/history"
            element={
              <DashboardLayout>
                <History />
              </DashboardLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
