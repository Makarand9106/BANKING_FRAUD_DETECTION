import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  formatCurrency, 
  formatDateTime, 
  getRiskBadgeClass, 
  getSeverityBadgeClass,
  getDecisionBadgeClass 
} from '../utils/riskUtils';
import { 
  ArrowLeft, 
  User, 
  ArrowRight, 
  Activity, 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Cpu,
  RefreshCw
} from 'lucide-react';

export const AccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAccountProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/accounts/${id}`);
      setProfile(response.data.data);
    } catch (err) {
      console.error('Failed to load account profile:', err.message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-surface border border-accent/5 p-12 text-center text-muted rounded-xl">
        <div className="flex items-center justify-center space-x-2 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Retrieving account ledger nodes...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-surface border border-accent/5 p-12 text-center text-muted rounded-xl">
        Account profile not found.
      </div>
    );
  }

  const { account, transactions, alerts, patterns } = profile;

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="space-y-1 pb-5 border-b border-accent/5">
        <Link to="/" className="text-xs text-muted hover:text-text-primary flex items-center space-x-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center space-x-2">
            <User className="w-6 h-6 text-accent" />
            <span>Account Profile: {account.accountNumber}</span>
          </h1>
          <span className={`px-3 py-1.5 rounded-full text-xs font-black self-start sm:self-center ${getRiskBadgeClass(account.riskScore)}`}>
            RISK RATING: {account.riskScore}%
          </span>
        </div>
      </div>

      {/* Grid of Key Info Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-surface p-4 border border-accent/5 rounded-xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Account Balance</span>
          <div className="text-xl font-black text-text-primary">{formatCurrency(account.balance)}</div>
        </div>
        <div className="bg-surface p-4 border border-accent/5 rounded-xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Account State</span>
          <div className="text-xl font-black text-text-primary uppercase">{account.status}</div>
        </div>
        <div className="bg-surface p-4 border border-accent/5 rounded-xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total Transactions</span>
          <div className="text-xl font-black text-text-primary">{account.totalTransactions}</div>
        </div>
        <div className="bg-surface p-4 border border-accent/5 rounded-xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Last Active</span>
          <div className="text-xl font-black text-text-primary">{formatDateTime(account.lastActiveAt)}</div>
        </div>
      </div>

      {/* Columns: Left Side (Transactions Ledger) | Right Side (Security & Patterns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Transactions) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-accent" />
              <span>Recent Transactions (Outbound & Inbound)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg/50 border-b border-accent/5 text-[9px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Merchant</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent/5">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-bg/10 transition-colors">
                        <td className="py-2.5 px-3 text-muted font-mono whitespace-nowrap">
                          {formatDateTime(tx.timestamp)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-text-primary">{tx.merchantName || 'Bank Transfer'}</div>
                          <div className="text-[10px] text-muted">{tx.location || 'N/A'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {tx.fraudScoreId ? (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getRiskBadgeClass(tx.fraudScoreId.totalScore)}`}>
                              {tx.fraudScoreId.totalScore}%
                            </span>
                          ) : (
                            <span className="text-muted text-[10px]">Unrated</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${getDecisionBadgeClass(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-muted">
                        No transactions registered for this account yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Alerts & Heuristics) */}
        <div className="space-y-6 text-xs">
          
          {/* Active Alerts */}
          <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-danger" />
              <span>Incident Ticket History</span>
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div
                    key={alert._id}
                    onClick={() => navigate(`/alerts/${alert._id}`)}
                    className="p-3 bg-bg hover:bg-accent/[0.02] border border-accent/5 rounded-lg space-y-1.5 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getSeverityBadgeClass(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-muted">{formatDateTime(alert.createdAt)}</span>
                    </div>
                    <div className="font-bold text-text-primary text-[11px] uppercase tracking-tight">
                      {alert.type.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted flex flex-col items-center justify-center space-y-1">
                  <CheckCircle className="w-6 h-6 text-success opacity-55" />
                  <span>No security alert incident records found.</span>
                </div>
              )}
            </div>
          </div>

          {/* C++ engine patterns detected */}
          <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-accent" />
              <span>C++ Heuristics Logs</span>
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {patterns.length > 0 ? (
                patterns.map((pat) => (
                  <div key={pat._id} className="p-3 bg-bg border border-accent/5 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-text-primary text-[10px] uppercase tracking-wider bg-accent/5 px-2 py-0.5 rounded">
                        {pat.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] text-muted">{new Date(pat.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      {pat.patternMeta?.detail || 'Graph heuristic pattern contribution flagged by engine.'}
                    </p>
                    <div className="text-[10px] text-text-primary font-bold">
                      Risk Contribution: <span className="text-danger">+{pat.riskScore}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted">
                  No fraud engine heuristics profiles recorded.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AccountDetail;
