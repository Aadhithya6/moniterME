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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4">
      <main className="max-w-lg text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-emerald-700">HealthyFi</h1>
        <p className="mb-8 text-lg text-slate-600">
          AI-powered fitness tracking. Track food, workouts, water, and goals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/login"
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-xl border-2 border-emerald-600 px-6 py-3 font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
