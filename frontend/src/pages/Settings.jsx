import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import api from '../services/api';
import { 
  Settings as SettingsIcon, 
  Lock, 
  KeyRound, 
  RefreshCw, 
  User, 
  ShieldCheck, 
  Bell, 
  Activity, 
  Sliders, 
  ShieldAlert,
  Info
} from 'lucide-react';

export const Settings = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('profile');

  // Tab 1: Profile & Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Tab 2: Notification Toggle States (Saved in localStorage)
  const [notifications, setNotifications] = useState({
    liveAlerts: true,
    criticalOnly: false,
    assignmentNotify: true,
    dailySummary: false
  });

  // Load notifications from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('sentinel_notifications_prefs');
    if (savedPrefs) {
      try {
        setNotifications(JSON.parse(savedPrefs));
      } catch (err) {
        console.error('Failed to parse saved notification preferences.');
      }
    }
  }, []);

  // Save notifications to localStorage
  const handleSaveNotifications = () => {
    localStorage.setItem('sentinel_notifications_prefs', JSON.stringify(notifications));
    showToast('success', 'Preferences Synchronized', 'Notification configurations stored in local terminal variables.');
  };

  // Change Password Submission
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('warning', 'Validation Error', 'Please populate all password parameters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('warning', 'Validation Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      showToast('warning', 'Validation Error', 'Security credentials must contain at least 8 characters.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      showToast('success', 'Credentials Modified', 'Platform password successfully updated. Logging out shortly...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto signout after 3s to let them reauth
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err) {
      showToast('danger', 'Credential Modification Failure', err.response?.data?.message || 'Error updating password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in text-xs">
      
      {/* Page Header */}
      <div className="pb-5 border-b border-accent/5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-accent" />
          <span>Operator Dashboard Settings</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Update security clearance credentials, configure notifications routing, or inspect fraud thresholds.
        </p>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex border-b border-accent/5 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-2.5 px-1 tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'profile' ? 'border-accent text-text-primary' : 'border-transparent text-muted hover:text-text-primary'
          }`}
        >
          Profile & Security
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-2.5 px-1 tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'notifications' ? 'border-accent text-text-primary' : 'border-transparent text-muted hover:text-text-primary'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`pb-2.5 px-1 tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'thresholds' ? 'border-accent text-text-primary' : 'border-transparent text-muted hover:text-text-primary'
          }`}
        >
          Risk Thresholds
        </button>
      </div>

      {/* Tab Contents */}
      <div className="animate-fade-in">
        
        {/* TAB 1: PROFILE & PASSWORD */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Operator info card */}
            <div className="md:col-span-1 bg-surface border border-accent/5 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2">
                Operator Ledger
              </h3>
              
              <div className="space-y-3">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Operator Identity</span>
                  <span className="font-semibold text-text-primary flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-muted" />
                    <span>{user?.email || 'N/A'}</span>
                  </span>
                </div>

                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Access Clearance Role</span>
                  <span className="font-mono bg-accent/5 px-2.5 py-0.5 rounded text-text-primary self-start font-bold uppercase border border-accent/10">
                    {user?.role || 'analyst'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-accent/5 text-[9px] text-muted flex items-start space-x-1.5 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                <span>Operator session permissions are mapped directly to standard backend middleware credentials.</span>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="md:col-span-2 bg-surface border border-accent/5 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2">
                Modify Platform Password
              </h3>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block font-bold text-muted uppercase tracking-wider mb-1.5">Current Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-muted uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters (1 uppercase, 1 digit)"
                      className="w-full pl-9 pr-4 py-2 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-muted uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 2: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="bg-surface border border-accent/5 rounded-xl p-6 shadow-sm space-y-6 max-w-2xl">
            
            <div className="border-b border-accent/5 pb-3">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
                <Bell className="w-4 h-4 text-accent" />
                <span>Notification Preferences</span>
              </h3>
              <p className="text-muted mt-1">
                Configure live message alerts and operational incident routing bounds.
              </p>
            </div>

            <div className="space-y-4">
              
              {/* Toggle 1: Live alerts */}
              <div className="flex items-center justify-between p-3 bg-bg/30 rounded-xl border border-accent/5">
                <div className="space-y-0.5">
                  <span className="font-bold text-text-primary">Live Fraud Alerts</span>
                  <p className="text-[10px] text-muted">Stream alerts immediately when flagged by graph heuristics.</p>
                </div>
                
                {/* Custom styled toggle instead of browser check */}
                <button
                  type="button"
                  onClick={() => setNotifications(prev => ({ ...prev, liveAlerts: !prev.liveAlerts }))}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    notifications.liveAlerts ? 'bg-success' : 'bg-accent/15'
                  }`}
                >
                  <div
                    className={`bg-surface w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                      notifications.liveAlerts ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Critical only */}
              <div className="flex items-center justify-between p-3 bg-bg/30 rounded-xl border border-accent/5">
                <div className="space-y-0.5">
                  <span className="font-bold text-text-primary">CRITICAL Alerts Only</span>
                  <p className="text-[10px] text-muted">Suppress low and medium severity alert triggers.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setNotifications(prev => ({ ...prev, criticalOnly: !prev.criticalOnly }))}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    notifications.criticalOnly ? 'bg-success' : 'bg-accent/15'
                  }`}
                >
                  <div
                    className={`bg-surface w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                      notifications.criticalOnly ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Assignments */}
              <div className="flex items-center justify-between p-3 bg-bg/30 rounded-xl border border-accent/5">
                <div className="space-y-0.5">
                  <span className="font-bold text-text-primary">Alert Assignment Notifications</span>
                  <p className="text-[10px] text-muted">Notify immediately when an alert is assigned to your queue.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setNotifications(prev => ({ ...prev, assignmentNotify: !prev.assignmentNotify }))}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    notifications.assignmentNotify ? 'bg-success' : 'bg-accent/15'
                  }`}
                >
                  <div
                    className={`bg-surface w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                      notifications.assignmentNotify ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: Daily summary */}
              <div className="flex items-center justify-between p-3 bg-bg/30 rounded-xl border border-accent/5">
                <div className="space-y-0.5">
                  <span className="font-bold text-text-primary">Daily Summary Email</span>
                  <p className="text-[10px] text-muted">Receive a consolidated summary of flagged cases every morning.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setNotifications(prev => ({ ...prev, dailySummary: !prev.dailySummary }))}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    notifications.dailySummary ? 'bg-success' : 'bg-accent/15'
                  }`}
                >
                  <div
                    className={`bg-surface w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                      notifications.dailySummary ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>

            <div className="pt-4 border-t border-accent/5 flex justify-end">
              <button
                onClick={handleSaveNotifications}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg shadow-sm"
              >
                Save Preferences
              </button>
            </div>

          </div>
        )}

        {/* TAB 3: RISK THRESHOLDS */}
        {activeTab === 'thresholds' && (
          <div className="space-y-6">
            
            {/* Warning block about locked state */}
            <div className="bg-warning-bg border border-warning/15 p-4 rounded-xl flex items-start space-x-3 text-warning">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div className="space-y-1">
                <span className="font-extrabold block">Risk Configurations Locked</span>
                <p className="text-[10px] leading-relaxed">
                  Threshold limits are defined in the C++ engine source. Rebuild engine to change weights.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Category Actions Card */}
              <div className="bg-surface border border-accent/5 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-accent" />
                  <span>Action Categorizations</span>
                </h3>

                <div className="space-y-3">
                  <div className="p-3 bg-success-bg border border-success/10 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-success block">APPROVE</span>
                      <span className="text-[10px] text-muted">Safe segments processed directly.</span>
                    </div>
                    <span className="font-mono text-sm font-black text-success">0 – 39</span>
                  </div>

                  <div className="p-3 bg-warning-bg border border-warning/10 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-warning block">REVIEW</span>
                      <span className="text-[10px] text-muted">Flagged segments route to ticketing queue.</span>
                    </div>
                    <span className="font-mono text-sm font-black text-warning">40 – 69</span>
                  </div>

                  <div className="p-3 bg-danger-bg border border-danger/10 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-danger block">BLOCK</span>
                      <span className="text-[10px] text-muted">High-risk segments frozen automatically.</span>
                    </div>
                    <span className="font-mono text-sm font-black text-danger">70 – 100</span>
                  </div>
                </div>
              </div>

              {/* Heuristics Contribution Card */}
              <div className="bg-surface border border-accent/5 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-accent" />
                  <span>Heuristics Weights Map</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-bg/50 border border-accent/5 rounded-xl">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Cycle loops</span>
                    <span className="text-sm font-black text-text-primary">+40</span>
                  </div>
                  
                  <div className="p-3 bg-bg/50 border border-accent/5 rounded-xl">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Velocity spikes</span>
                    <span className="text-sm font-black text-text-primary">+20</span>
                  </div>

                  <div className="p-3 bg-bg/50 border border-accent/5 rounded-xl">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Smurfing Wires</span>
                    <span className="text-sm font-black text-text-primary">+25</span>
                  </div>

                  <div className="p-3 bg-bg/50 border border-accent/5 rounded-xl">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Balance Drains</span>
                    <span className="text-sm font-black text-text-primary">+30</span>
                  </div>

                  <div className="p-3 bg-bg/50 border border-accent/5 rounded-xl">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Dormant activity</span>
                    <span className="text-sm font-black text-text-primary">+15</span>
                  </div>

                  <div className="p-3 bg-bg/50 border border-accent/5 rounded-xl">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Risk propagation</span>
                    <span className="text-sm font-black text-text-primary">+20 (max)</span>
                  </div>
                </div>

                <div className="text-[9px] text-muted flex items-start space-x-1 pt-1">
                  <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                  <span>These weights act as independent additive modifiers processed inside the C++ scoring core.</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;
