import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/add-food', label: 'Add Food' },
  { href: '/add-workout', label: 'Add Workout' },
  { href: '/goals', label: 'Goals' },
  { href: '/history', label: 'History' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="text-xl font-bold text-emerald-600">
          HealthyFi
        </Link>
        <div className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? 'text-emerald-600'
                  : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
