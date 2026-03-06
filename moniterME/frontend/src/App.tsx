import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import FoodModule from '@/pages/FoodModule';
import WorkoutModule from '@/pages/WorkoutModule';
import SleepModule from '@/pages/SleepModule';
import Goals from '@/pages/Goals';
import History from '@/pages/History';
import Onboarding from '@/pages/Onboarding';
import AgentHub from '@/pages/AgentHub';

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
            path="/food"
            element={
              <DashboardLayout>
                <FoodModule />
              </DashboardLayout>
            }
          />
          <Route
            path="/workout-hub"
            element={
              <DashboardLayout>
                <WorkoutModule />
              </DashboardLayout>
            }
          />
          <Route path="/add-workout" element={<Navigate to="/workout-hub" replace />} />
          <Route
            path="/sleep"
            element={
              <DashboardLayout>
                <SleepModule />
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
          <Route
            path="/agent"
            element={
              <DashboardLayout>
                <AgentHub />
              </DashboardLayout>
            }
          />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
