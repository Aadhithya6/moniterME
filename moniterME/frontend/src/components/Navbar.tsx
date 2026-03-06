import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { href: '/dashboard', label: 'DB', icon: 'M4 6h16M4 12h16M4 18h16' },
  { href: '/food', label: 'FD', icon: 'M12 3v18m9-9H3' },
  { href: '/workout-hub', label: 'TR', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { href: '/sleep', label: 'SL', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
  { href: '/agent', label: 'AI', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1' },
  { href: '/goals', label: 'GL', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/history', label: 'HS', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
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
    <div className="fixed left-0 top-0 h-screen w-20 bg-[#0A0D12] border-r border-[#161B23] flex flex-col items-center py-8 z-50">
      <Link to="/dashboard" className="mb-12 group">
        <div className="w-10 h-10 border-2 border-[#B4F000] flex items-center justify-center font-bold text-[#B4F000] text-xs skew-x-[-12deg] group-hover:bg-[#B4F000] group-hover:text-black transition-all">
          M
        </div>
      </Link>

      <nav className="flex-1 space-y-8">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.href;
          const isAgent = link.href === '/agent';
          return (
            <Link
              key={link.href}
              to={link.href}
              className={`relative flex flex-col items-center group transition-all ${isActive ? 'text-[#B4F000]' : isAgent ? 'text-[#8B949E] hover:text-[#B4F000]' : 'text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
            >
              {isActive && (
                <div className="absolute -left-[42px] top-1/2 -translate-y-1/2 w-[2px] h-8 bg-[#B4F000] shadow-[4px_0_12px_rgba(180,240,0,0.4)]" />
              )}
              {isAgent && !isActive && (
                <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[#B4F000] animate-pulse" />
              )}
              <svg
                className="w-5 h-5 mb-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={isActive ? 2.5 : 2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
              </svg>
              <span className="text-[0.6rem] font-bold tracking-widest">{link.label}</span>
            </Link>
          );
        })}

      </nav>

      <div className="mt-auto flex flex-col gap-6 items-center">
        <button
          onClick={handleLogout}
          className="text-[#8B949E] hover:text-[#FF595E] transition-colors"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <div className="w-8 h-8 bg-[#161B23] border border-[#3A86FF]/30 flex items-center justify-center text-[0.7rem] font-bold text-[#3A86FF] font-mono-numeric">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
