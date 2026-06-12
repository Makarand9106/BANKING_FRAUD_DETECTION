import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, Mail, Lock, UserPlus, RefreshCw, Users } from 'lucide-react';

export const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('analyst');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrMsg('');
    setSuccessMsg('');
    try {
      await register(email, password, role);
      setSuccessMsg('Account registered successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrMsg(err.message || 'Registration failed. Try a different email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-accent/5 rounded-2xl shadow-xl p-8 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent text-surface flex items-center justify-center rounded-xl mb-3 shadow-md">
            <ShieldAlert className="w-6 h-6 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Sentinel Guard</h2>
          <p className="text-xs text-muted mt-1">Graph-Based Banking Fraud Detection System</p>
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-6 text-center">Create Operator Account</h3>

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
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters (1 uppercase, 1 digit)"
                className="w-full pl-9 pr-4 py-2.5 bg-bg text-text-primary text-sm border border-accent/10 rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Operational Role</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Users className="w-4 h-4" />
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-bg text-text-primary text-sm border border-accent/10 rounded-xl focus:outline-none focus:border-accent transition-colors appearance-none"
              >
                <option value="analyst">Security Analyst</option>
                <option value="manager">Risk Manager</option>
                <option value="admin">System Administrator</option>
              </select>
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register Operator</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-accent/5 text-center">
          <p className="text-xs text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
