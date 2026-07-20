import React, { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Globe, Shield, Trash2, ChevronRight, 
  AlertTriangle, Check, X, Smartphone, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Settings = () => {
  const { user } = useAppSelector(state => state.auth);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('notifications');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Mock settings state
  const [settings, setSettings] = useState({
    emailAlerts: true,
    pushNotifications: false,
    marketingEmails: true,
    language: 'English (US)',
    currency: 'USD ($)',
  });

  if (!user) return null;

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'security', label: 'Security & Data', icon: Shield },
  ];

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/profile')}
          className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-2 mb-4"
        >
          <ChevronRight size={14} className="rotate-180" /> Back to Profile
        </button>
        <h1 className="text-3xl font-medium text-white">Account Settings</h1>
        <p className="text-white/40 mt-2">Manage your preferences and account configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="md:col-span-4">
          <Card className="p-4 space-y-2 sticky top-24">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </Card>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'notifications' && (
                <Card className="p-8">
                  <h2 className="text-xl font-medium text-white mb-6">Notification Preferences</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-white/5 text-white/40">
                          <Mail size={18} />
                        </div>
                        <div>
                          <div className="text-white font-medium">Email Alerts</div>
                          <div className="text-sm text-white/40">Receive updates about your bookings</div>
                        </div>
                      </div>
                      <Toggle 
                        checked={settings.emailAlerts} 
                        onChange={() => handleToggle('emailAlerts')} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-white/5 text-white/40">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <div className="text-white font-medium">Push Notifications</div>
                          <div className="text-sm text-white/40">Get real-time alerts on your device</div>
                        </div>
                      </div>
                      <Toggle 
                        checked={settings.pushNotifications} 
                        onChange={() => handleToggle('pushNotifications')} 
                      />
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'preferences' && (
                <Card className="p-8">
                  <h2 className="text-xl font-medium text-white mb-6">Regional Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">
                        Display Language
                      </label>
                      <select 
                        value={settings.language}
                        onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 appearance-none"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="English (UK)">English (UK)</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">
                        Preferred Currency
                      </label>
                      <select 
                        value={settings.currency}
                        onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 appearance-none"
                      >
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                        <option value="GBP (£)">GBP (£)</option>
                        <option value="INR (₹)">INR (₹)</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="p-8 border border-red-500/20">
                  <h2 className="text-xl font-medium text-red-500 mb-6 flex items-center gap-2">
                    <AlertTriangle size={20} /> Danger Zone
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                      <h3 className="text-white font-medium mb-2">Delete Account</h3>
                      <p className="text-white/40 text-sm mb-6">
                        Once you delete your account, there is no going back. Please be certain. All your bookings and personal data will be permanently erased.
                      </p>
                      <Button 
                        variant="secondary" 
                        className="text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        <Trash2 size={16} className="mr-2" /> Delete My Account
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="liquid-glass w-full max-w-md bg-white/5 p-8 rounded-3xl relative z-10 border border-red-500/30"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-2xl font-medium text-white mb-2">Are you sure?</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-8">
                This action cannot be undone. All of your data, including event bookings and preferences, will be permanently deleted from our servers.
              </p>
              
              <div className="flex gap-4">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none"
                  onClick={() => {
                    // Placeholder for actual delete logic
                    setShowDeleteModal(false);
                    alert('Account deletion endpoint not yet implemented.');
                  }}
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reusable Toggle Component
const Toggle = ({ checked, onChange }) => (
  <button 
    onClick={onChange}
    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${
      checked ? 'bg-emerald-500' : 'bg-white/10'
    }`}
  >
    <div 
      className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
        checked ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

export default Settings;
