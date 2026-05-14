import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login, googleLogin, clearError } from '../store/slices/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin as GoogleLoginButton } from '@react-oauth/google';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (user) navigate('/');
    return () => dispatch(clearError());
  }, [user, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(formData));
  };

  const handleGoogleSuccess = (credentialResponse) => {
    dispatch(googleLogin(credentialResponse.credential));
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="liquid-glass w-full max-w-md bg-white/5 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-white/10">
            <LogIn size={32} className="text-black" />
          </div>
          <h2 className="text-3xl font-medium text-white mb-2">Welcome Back</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            icon={Mail}
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <div className="flex justify-end">
            <Link to="/forgot-password" size="sm" className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm text-center font-medium">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full py-4 text-base" 
            loading={loading}
          >
            Sign In <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">or</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="flex justify-center">
           <div className="liquid-glass p-1 rounded-xl w-full">
              <GoogleLoginButton
                onSuccess={handleGoogleSuccess}
                onError={() => console.log('Login Failed')}
                theme="filled_black"
                shape="pill"
                width="100%"
                text="continue_with"
              />
           </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-white/40 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-white font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
