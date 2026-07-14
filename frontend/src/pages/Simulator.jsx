import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatCurrency } from '../utils/riskUtils';
import { Zap, RefreshCw, HelpCircle, Sparkles, Info, ShieldCheck } from 'lucide-react';

export const Simulator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [topAccounts, setTopAccounts] = useState([]);
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    merchantName: 'Apple Store',
    location: 'San Francisco, CA',
    deviceId: 'DEV-99881'
  });

  const fetchTopAccounts = async () => {
    try {
      const response = await api.get('/api/accounts/top-suspicious');
      setTopAccounts(response.data.data || []);
    } catch (err) {
      console.error('Failed to load accounts for simulator:', err.message);
    }
  };

  useEffect(() => {
    fetchTopAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        merchantName: formData.merchantName,
        location: formData.location,
        deviceId: formData.deviceId,
        timestamp: new Date().toISOString()
      };

      if (formData.fromAccountId.trim()) {
        payload.fromAccountId = formData.fromAccountId.trim();
      }
      if (formData.toAccountId.trim()) {
        payload.toAccountId = formData.toAccountId.trim();
      }

      const res = await api.post('/api/transactions', payload);
      setSuccess(`Transaction ingested successfully! Computed Risk Score: ${res.data.data.fraudScoreId?.totalScore || 0}% [Decision: ${res.data.data.status.toUpperCase()}]`);
      
      setFormData({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        merchantName: 'Apple Store',
        location: 'San Francisco, CA',
        deviceId: 'DEV-99881'
      });
      fetchTopAccounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Ingestion failure. Verify account IDs and balances.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs max-w-4xl">
      <div className="pb-5 border-b border-accent/5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center space-x-2">
          <Zap className="w-6 h-6 text-warning" />
          <span>Interactive Transaction Ingestion Simulator</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Generate live transactions to test cycle, velocity, and topK heap updates inside the C++ Fraud Detection Engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="md:col-span-2 bg-surface border border-accent/5 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-warning" />
            <span>Simulate Live Ingestion</span>
          </h3>

          {error && (
            <div className="p-3 bg-danger-bg text-danger border border-danger/10 text-xs rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-success-bg text-success border border-success/10 text-xs rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Source Account ID</label>
                <input
                  type="text"
                  placeholder="Mongo ObjectId"
                  value={formData.fromAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromAccountId: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Destination Account ID</label>
                <input
                  type="text"
                  placeholder="Mongo ObjectId"
                  value={formData.toAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, toAccountId: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Transfer Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="4500.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Merchant Name</label>
                <input
                  type="text"
                  required
                  value={formData.merchantName}
                  onChange={(e) => setFormData(prev => ({ ...prev, merchantName: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Device ID</label>
                <input
                  type="text"
                  required
                  value={formData.deviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Merchant Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-surface text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Streaming parameters to C++ fraud engine...</span>
                </>
              ) : (
                <span>Simulate Ingestion</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Help Sidebar */}
        <div className="bg-surface border border-accent/5 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-info" />
              <span>Suspicious Account Quickfill</span>
            </h4>
            <p className="text-[10px] text-muted mb-3 leading-relaxed">
              Click buttons below to autofill source or destination account parameters instantly.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {topAccounts.map(({ account }) => (
                <div key={account._id} className="p-2 bg-bg rounded-lg border border-accent/5 text-[10px] space-y-1">
                  <div className="flex justify-between font-mono font-semibold">
                    <span>{account.accountNumber}</span>
                    <span className="text-danger font-bold">{account.riskScore}% Risk</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Bal: {formatCurrency(account.balance)}</span>
                  </div>
                  <div className="flex items-center space-x-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fromAccountId: account._id }))}
                      className="flex-1 py-0.5 bg-accent/5 hover:bg-accent/10 rounded font-bold text-text-primary text-[9px] border border-accent/5"
                    >
                      As Source
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, toAccountId: account._id }))}
                      className="flex-1 py-0.5 bg-accent/5 hover:bg-accent/10 rounded font-bold text-text-primary text-[9px] border border-accent/5"
                    >
                      As Dest
                    </button>
                  </div>
                </div>
              ))}
              {topAccounts.length === 0 && (
                <div className="text-center py-6 text-muted">
                  No accounts found. Ingest transactions to build node balances.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-accent/5 text-[9px] text-muted leading-relaxed flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <span>Ingestion streams directly to standard inputs on the compiled binary.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulator;
