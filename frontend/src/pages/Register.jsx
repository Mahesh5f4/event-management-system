import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { register } from '../store/slices/authSlice';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector(state => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    try {
      const resultAction = await dispatch(register(formData));
      if (register.fulfilled.match(resultAction)) {
        setStatus({ type: 'success', message: 'Account created! Redirecting to login...' });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setStatus({ type: 'error', message: resultAction.payload || 'Registration failed.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-32 bg-slate-950 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] relative z-10"
      >
        <div className="premium-card p-8 md:p-10">
          <div className="mb-10 text-center md:text-left">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 mb-6 mx-auto md:mx-0">
              <UserPlus size={24} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create an account</h1>
            <p className="text-slate-400">Join our community for exclusive event access</p>
          </div>

          {status.message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-8 p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
                status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{status.message}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Full Name"
              type="text" 
              required 
              icon={User}
              placeholder="Jane Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Input 
              label="Work Email"
              type="email" 
              required 
              icon={Mail}
              placeholder="jane@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input 
              label="Password"
              type="password" 
              required 
              icon={Lock}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800 mb-4">
               <ShieldCheck size={20} className="text-indigo-400 mt-0.5 shrink-0" />
               <p className="text-xs text-slate-500 leading-relaxed">
                 By joining, you agree to our <Link to="#" className="text-white hover:underline">Terms</Link> and <Link to="#" className="text-white hover:underline">Privacy Policy</Link>.
               </p>
            </div>

            <Button type="submit" loading={loading} className="btn-primary w-full py-4 text-base">
              Get Started <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-10">
            Already have an account? <Link to="/login" className="text-white font-semibold hover:text-indigo-400 transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
