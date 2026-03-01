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
      <div className="min-h-screen bg-[#0A0D12] text-[#E6EDF3] selection:bg-[#B4F000] selection:text-black">
        <div className="performance-glow" />
        <Navbar />
        <main className="pl-20 min-h-screen">
          <div className="p-12 animate-in fade-in duration-1000">
            {children}
          </div>
        </main>
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
