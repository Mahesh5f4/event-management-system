import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Shield, Calendar, MapPin, Camera, LogOut, Ticket, Settings, Bell, 
  Check, X, Key, Edit2, Loader2 
} from 'lucide-react';
import { logout, updateProfile, sendChangePasswordOtp, changePassword } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

const Profile = () => {
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState('initial'); // initial, otp, success
  const [passwordData, setPasswordData] = useState({ otp: '', newPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleUpdateName = async () => {
    if (!editedName.trim() || editedName === user.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdatingName(true);
    try {
      await dispatch(updateProfile({ name: editedName })).unwrap();
      setIsEditingName(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSendOtp = async () => {
    setIsChangingPassword(true);
    setPasswordError('');
    try {
      await dispatch(sendChangePasswordOtp({ email: user.email })).unwrap();
      setPasswordStep('otp');
    } catch (error) {
      setPasswordError(error || 'Failed to send OTP');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleVerifyPasswordChange = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError('');
    try {
      await dispatch(changePassword({ 
        email: user.email, 
        otp: passwordData.otp, 
        newPassword: passwordData.newPassword 
      })).unwrap();
      setPasswordStep('success');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordStep('initial');
        setPasswordData({ otp: '', newPassword: '' });
      }, 2000);
    } catch (error) {
      setPasswordError(error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const stats = [
    { label: 'Experiences', value: '12', icon: Ticket },
    { label: 'Cities', value: '4', icon: MapPin },
    { 
      label: 'Member Since', 
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'May 2026', 
      icon: Calendar 
    },
  ];

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4">
          <Card className="p-8 text-center sticky top-24">
            <div className="relative w-32 h-32 mx-auto mb-6 group">
              <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-white overflow-hidden border border-white/10">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={64} className="opacity-20" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>
            
            <div className="mb-1 flex items-center justify-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white outline-none focus:border-white/40 w-full max-w-[150px] text-center"
                    autoFocus
                    disabled={isUpdatingName}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                  />
                  <button 
                    onClick={handleUpdateName} 
                    disabled={isUpdatingName}
                    className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {isUpdatingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button 
                    onClick={() => { setIsEditingName(false); setEditedName(user.name); }}
                    disabled={isUpdatingName}
                    className="p-1.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <h1 className="text-2xl font-medium text-white flex items-center gap-2 group">
                  {user.name || user.email?.split('@')[0] || 'User'}
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 size={14} />
                  </button>
                </h1>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 mb-8 mt-2">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                {user.role} Member
              </p>
              {user.email?.endsWith('@gmail.com') && (
                <Badge variant="secondary" className="text-[8px] py-0.5 px-1.5 opacity-60">Google</Badge>
              )}
            </div>

            <div className="space-y-3">
              <Button variant="secondary" className="w-full justify-start text-xs group" onClick={() => setShowPasswordModal(true)}>
                <Key size={14} className="mr-3 text-white/40 group-hover:text-white transition-colors" /> Change Password
              </Button>
              <Button variant="secondary" className="w-full justify-start text-xs group" onClick={() => navigate('/settings')}>
                <Settings size={14} className="mr-3 text-white/40 group-hover:text-white transition-colors" /> Account Settings
              </Button>
              <Button variant="secondary" className="w-full justify-start text-xs group text-red-400 hover:text-red-300" onClick={handleLogout}>
                <LogOut size={14} className="mr-3" /> Sign Out
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Details & Activity */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <Card key={i} className="p-6 text-center">
                <div className="text-white/20 mb-2 flex justify-center">
                  <stat.icon size={18} />
                </div>
                <div className="text-xl font-medium text-white mb-1">{stat.value}</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Identity Section */}
          <Card className="p-8">
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <Shield size={16} className="text-white/20" /> Identity Information
            </h2>
            
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 text-white/40">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/20 uppercase tracking-widest mb-1">Primary Email</div>
                    <div className="text-white font-medium">{user.email}</div>
                  </div>
                </div>
                <Badge variant="secondary">Verified</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 text-white/40">
                    <Shield size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/20 uppercase tracking-widest mb-1">Access Tier</div>
                    <div className="text-white font-medium">{user.role === 'ADMIN' ? 'Full System Access' : 'Standard Experience Tier'}</div>
                  </div>
                </div>
                <Badge variant="primary">{user.role}</Badge>
              </div>
            </div>
          </Card>

          {/* Recent Activity Placeholder */}
          <Card className="p-8">
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-8">Recent Journey</h2>
            <div className="space-y-6">
              {[
                { event: 'AI Architecture Summit', date: 'Oct 24, 2025', status: 'Upcoming' },
                { event: 'Global Design Biennale', date: 'Sep 12, 2025', status: 'Completed' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                      <Ticket size={18} />
                    </div>
                    <div>
                      <div className="text-white font-medium group-hover:text-white transition-colors">{item.event}</div>
                      <div className="text-[10px] text-white/30 uppercase font-bold mt-0.5">{item.date}</div>
                    </div>
                  </div>
                  <Badge variant={item.status === 'Upcoming' ? 'primary' : 'secondary'}>{item.status}</Badge>
                </div>
              ))}
              <button className="w-full py-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors">
                View Complete History
              </button>
            </div>
          </Card>

        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isChangingPassword && setShowPasswordModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="liquid-glass w-full max-w-md bg-white/5 p-8 rounded-3xl relative z-10 border border-white/10"
            >
              <button 
                onClick={() => setShowPasswordModal(false)}
                disabled={isChangingPassword}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 border border-white/10">
                  <Key size={24} />
                </div>
                <h3 className="text-2xl font-medium text-white mb-2">Secure Update</h3>
                <p className="text-white/40 text-xs uppercase tracking-widest font-bold">
                  {passwordStep === 'initial' ? 'Change Password' : passwordStep === 'otp' ? 'Verify OTP' : 'Success'}
                </p>
              </div>

              {passwordError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                  {passwordError}
                </div>
              )}

              {passwordStep === 'initial' && (
                <div className="space-y-6 text-center">
                  <p className="text-white/60 text-sm leading-relaxed">
                    To change your password securely, we need to send a one-time verification code to <strong>{user.email}</strong>.
                  </p>
                  <Button 
                    className="w-full py-4" 
                    onClick={handleSendOtp}
                    loading={isChangingPassword}
                  >
                    Send Verification Code
                  </Button>
                </div>
              )}

              {passwordStep === 'otp' && (
                <form onSubmit={handleVerifyPasswordChange} className="space-y-6">
                  <p className="text-white/60 text-sm text-center leading-relaxed mb-6">
                    Enter the 6-digit code sent to your email and your new password.
                  </p>
                  <Input
                    label="OTP Code"
                    type="text"
                    placeholder="123456"
                    required
                    value={passwordData.otp}
                    onChange={(e) => setPasswordData({ ...passwordData, otp: e.target.value })}
                    maxLength={6}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <Button 
                    type="submit"
                    className="w-full py-4" 
                    loading={isChangingPassword}
                  >
                    Confirm Change
                  </Button>
                </form>
              )}

              {passwordStep === 'success' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <Check size={32} />
                  </div>
                  <h4 className="text-xl text-white font-medium">Password Updated</h4>
                  <p className="text-emerald-500/80 text-sm">Your account is secure.</p>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
