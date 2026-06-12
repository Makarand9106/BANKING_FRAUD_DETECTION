import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, Mail, ArrowLeft, RefreshCw, Key } from 'lucide-react';

export const ForgotPassword = () => {
  const { forgotPassword } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrMsg('');
    setSuccessMsg('');
    try {
      await forgotPassword(email);
      setSuccessMsg('OTP generated successfully. Since this is a local server, please check the backend terminal logs to read your 6-digit verification code.');
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 3000);
    } catch (err) {
      setErrMsg(err.message || 'No account associated with this email address.');
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

        <h3 className="text-lg font-semibold text-text-primary mb-2 text-center font-semibold">Reset Password</h3>
        <p className="text-xs text-muted text-center mb-6 leading-relaxed">
          Specify your registered email. We will generate a secure OTP code in the backend console logs to verify your identity.
        </p>

        {errMsg && (
          <div className="mb-4 p-3 bg-danger-bg text-danger border border-danger/10 text-xs rounded-lg animate-fade-in">
            {errMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-success-bg text-success border border-success/10 text-xs rounded-lg animate-fade-in leading-relaxed">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-accent hover:bg-accent/90 text-surface font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-75"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating OTP...</span>
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                <span>Generate OTP</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-accent/5 flex justify-between text-xs font-semibold">
          <Link to="/login" className="text-muted hover:text-text-primary flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
          <Link to="/reset-password" className="text-text-primary hover:underline">
            Already have an OTP?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
