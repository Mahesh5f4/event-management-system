import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { Infinity, Menu, X, LogOut, User } from 'lucide-react';
import { useState, useCallback, useMemo, memo } from 'react';

const Navbar = () => {
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  const navLinks = useMemo(() => [
    { label: 'Discover', to: '/' },
    { label: 'My Tickets', to: '/bookings', private: true },
    { label: 'Admin', to: '/admin', admin: true },
  ], []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transform-gpu antialiased">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 text-white font-medium z-50">
        <Infinity size={24} strokeWidth={1.5} />
        <span className="tracking-tight text-lg">Equilibrium</span>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex liquid-glass items-center gap-1 rounded-xl px-2 py-2 transform-gpu">
        {navLinks.map((link) => {
          if (link.private && !user) return null;
          if (link.admin && user?.role !== 'ADMIN') return null;
          const isActive = location.pathname === link.to;
          return (
            <Link 
              key={link.label}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* User Actions */}
      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <Link 
              to="/profile" 
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl liquid-glass hover:bg-white/10 transition-all border border-transparent hover:border-white/5 group transform-gpu"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                ) : (
                  <User size={16} />
                )}
              </div>
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                {user.name || user.email?.split('@')[0] || 'User'}
              </span>
            </Link>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl liquid-glass text-white/40 hover:text-white transition-all transform-gpu"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-white/60 hover:text-white text-sm font-medium px-4 py-2">
              Log in
            </Link>
            <Link to="/register" className="bg-white text-black text-sm font-medium px-5 py-2 rounded-full hover:bg-white/90 transition-all">
              Sign Up
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Toggle */}
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden p-2 rounded-xl liquid-glass text-white z-50 transform-gpu"
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-20 left-6 right-6 z-40 md:hidden liquid-glass rounded-2xl p-4 flex flex-col gap-2 transform-gpu">
          {navLinks.map((link) => {
            if (link.private && !user) return null;
            if (link.admin && user?.role !== 'ADMIN') return null;
            const isActive = location.pathname === link.to;
            return (
              <Link 
                key={link.label}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm transition-all ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
              >
                {link.label}
              </Link>
            );
          })}
          {!user && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="text-center py-3 rounded-xl liquid-glass text-white text-sm font-medium">
                Log in
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="text-center py-3 rounded-xl bg-white text-black text-sm font-medium">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default memo(Navbar);
