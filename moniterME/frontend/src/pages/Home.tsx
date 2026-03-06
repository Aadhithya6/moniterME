import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0F]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0F] px-4">
      <main className="max-w-2xl text-center animate-in fade-in duration-700">
        <div className="mb-12">
          <h1 className="mb-4 text-6xl font-bold tracking-tight text-gray-100">
            Healthy<span className="text-emerald-400">Fi</span>
          </h1>
          <p className="text-xl text-gray-400">
            AI-powered fitness tracking for the modern athlete
          </p>
          <p className="mt-3 text-gray-500">
            Track food, workouts, water intake, and achieve your goals
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Link
            to="/login"
            className="glass-button-primary px-8 py-3 text-lg"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="glass-button px-8 py-3 text-lg"
          >
            Register
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div className="glass-card p-6">
            <div className="text-3xl mb-2">🍽️</div>
            <p className="text-sm text-gray-400">AI Macro Tracking</p>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl mb-2">💪</div>
            <p className="text-sm text-gray-400">Workout Logging</p>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm text-gray-400">Goal Monitoring</p>
          </div>
        </div>
      </main>
    </div>
  );
}
