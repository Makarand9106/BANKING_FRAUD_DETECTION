import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, Mail, Lock, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';

export const ResetPassword = () => {
  const { resetPassword } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword) {
      setErrMsg('All fields are required.');
      return;
    }

    if (otp.length !== 6 || isNaN(otp)) {
      setErrMsg('OTP must be exactly a 6-digit number.');
      return;
    }

    if (newPassword.length < 8) {
      setErrMsg('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrMsg('');
    setSuccessMsg('');
    try {
      await resetPassword(email, otp, newPassword);
      setSuccessMsg('Password reset completed successfully! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setErrMsg(err.message || 'Verification failed. Please review your OTP and input parameters.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-accent/5 rounded-2xl shadow-xl p-8 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-accent text-surface flex items-center justify-center rounded-xl mb-3 shadow-md">
            <ShieldAlert className="w-6 h-6 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Sentinel Guard</h2>
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-2 text-center">Verify Identity & Reset</h3>
        <p className="text-xs text-muted text-center mb-6">
          Enter the 6-digit OTP code printed in the server logs and declare your new credentials.
        </p>

        {errMsg && (
          <div className="mb-4 p-3 bg-danger-bg text-danger border border-danger/10 text-xs rounded-lg animate-fade-in">
            {errMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-success-bg text-success border border-success/10 text-xs rounded-lg animate-fade-in">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@sentinel.com"
                className="w-full pl-9 pr-4 py-2.5 bg-bg text-text-primary text-sm border border-accent/10 rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">6-Digit Verification OTP</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full pl-9 pr-4 py-2.5 bg-bg text-text-primary text-sm border border-accent/10 rounded-xl focus:outline-none focus:border-accent tracking-widest transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters (1 uppercase, 1 digit)"
                className="w-full pl-9 pr-4 py-2.5 bg-bg text-text-primary text-sm border border-accent/10 rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-accent hover:bg-accent/90 text-surface font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-75"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Resetting Password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-accent/5 text-center">
          <Link to="/login" className="text-xs text-muted hover:text-text-primary flex items-center justify-center space-x-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
