import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login as loginThunk } from '../store/slices/authSlice';
import { authService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error: reduxError } = useAppSelector(state => state.auth);

  const error = localError || reduxError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const response = await authService.login(formData);
      if (response.data.requires2FA) {
        setShowOtp(true);
      } else {
        const resultAction = await dispatch(loginThunk(formData));
        if (loginThunk.fulfilled.match(resultAction)) {
          navigate('/');
        }
      }
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const response = await authService.verifyOtp({ email: formData.email, otp });
      const data = response.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ email: data.email, role: data.role }));
      dispatch({ type: 'auth/login/fulfilled', payload: data });
      navigate('/');
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Invalid or expired OTP.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLocalError('');
    try {
      const response = await authService.googleLogin({ credential: credentialResponse.credential });
      const data = response.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ email: data.email, role: data.role }));
      dispatch({ type: 'auth/login/fulfilled', payload: data });
      navigate('/');
    } catch (err) {
      setLocalError('Google login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-32 bg-slate-950 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="premium-card p-8 md:p-10">
          <AnimatePresence mode="wait">
            {!showOtp ? (
              <motion.div 
                key="login"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 mb-6">
                    <LogIn size={24} />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
                  <p className="text-slate-400">Sign in to your account to continue</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input 
                    label="Email Address"
                    type="email" 
                    required 
                    icon={Mail}
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />

                  <div className="space-y-1">
                    <Input 
                      label="Password"
                      type="password" 
                      required 
                      icon={Lock}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <div className="flex justify-end">
                      <Link to="/forgot-password" size="sm" className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest">
                        Forgot Password?
                      </Link>
                    </div>
                  </div>

                  <Button type="submit" loading={loading} className="btn-primary w-full py-3.5">
                    Sign In <ArrowRight size={18} className="ml-2" />
                  </Button>
                </form>

                <div className="relative my-8 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <span className="relative px-4 bg-surface text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">
                    Or continue with
                  </span>
                </div>

                <div className="flex justify-center mb-10">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setLocalError('Google login failed')}
                    theme="filled_black"
                    shape="pill"
                    width="100%"
                  />
                </div>

                <p className="text-center text-slate-500 text-sm">
                  Don't have an account? <Link to="/register" className="text-white font-semibold hover:text-indigo-400 transition-colors">Sign up</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-10">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-6">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Security Check</h2>
                  <p className="text-slate-400">Enter the verification code sent to your email.</p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="space-y-3 text-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verification Code</label>
                    <input 
                      type="text" 
                      required 
                      maxLength="6"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-5 text-center text-3xl font-bold tracking-[12px] text-white focus:border-indigo-500/50 outline-none transition-all"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <Button type="submit" loading={loading} disabled={otp.length !== 6} className="btn-primary w-full py-3.5">
                    Verify & Login
                  </Button>

                  <button 
                    type="button" 
                    onClick={() => setShowOtp(false)}
                    className="w-full text-slate-500 hover:text-white transition-colors font-semibold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
