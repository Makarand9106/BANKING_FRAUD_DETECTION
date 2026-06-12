import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
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
  ShieldAlert, 
  User, 
  Calendar, 
  Activity, 
  DollarSign, 
  Key, 
  Cpu, 
  CheckCircle2, 
  RefreshCw,
  UserCheck,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';

export const AlertDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchAlertDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/alerts/${id}`);
      setAlert(response.data.data);
    } catch (err) {
      console.error('Failed to load alert details:', err.message);
      navigate('/alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertDetail();
  }, [id]);

  const handleClaim = async () => {
    setSubmitting(true);
    try {
      const response = await api.patch(`/api/alerts/${id}/assign`, { assignedTo: user.id });
      setAlert(response.data.data);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (window.confirm('Mark this alert ticket as resolved?')) {
      setSubmitting(true);
      try {
        const response = await api.patch(`/api/alerts/${id}/resolve`);
        setAlert(response.data.data);
      } catch (err) {
        window.alert(err.response?.data?.message || 'Resolution failed.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTransactionStatusUpdate = async (status) => {
    if (!alert?.transactionId) return;
    if (window.confirm(`Update transaction status to ${status.toUpperCase()}?`)) {
      setStatusUpdating(true);
      try {
        await api.patch(`/api/transactions/${alert.transactionId._id}/status`, { status });
        await fetchAlertDetail(); // reload
      } catch (err) {
        window.alert(err.response?.data?.message || 'Status update failed.');
      } finally {
        setStatusUpdating(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-accent/5 p-12 text-center text-muted rounded-xl">
        <div className="flex items-center justify-center space-x-2 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Retrieving computed engine context...</span>
        </div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="bg-surface border border-accent/5 p-12 text-center text-muted rounded-xl">
        Alert profile not found.
      </div>
    );
  }

  const tx = alert.transactionId || {};
  const scoreData = tx.fraudScoreId || alert.signals ? {
    totalScore: alert.riskScore,
    severity: alert.severity,
    signals: alert.signals || [],
    decision: alert.transactionId?.status || 'REVIEW'
  } : null;

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-accent/5 gap-4">
        <div className="space-y-1">
          <Link to="/alerts" className="text-xs text-muted hover:text-text-primary flex items-center space-x-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to alerts queue</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center space-x-2 pt-2">
            <ShieldAlert className="w-6 h-6 text-danger" />
            <span>Case File: {alert.type.replace(/_/g, ' ')}</span>
          </h1>
        </div>

        {/* Action button row */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          {!alert.resolved ? (
            <>
              {!alert.assignedTo && (
                <button
                  onClick={handleClaim}
                  disabled={submitting}
                  className="px-4 py-2 bg-bg hover:bg-accent/5 text-text-primary text-sm font-semibold rounded-xl border border-accent/10 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Assign to Me</span>
                </button>
              )}
              <button
                onClick={handleResolve}
                disabled={submitting}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-surface text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Mark as Resolved</span>
              </button>
            </>
          ) : (
            <div className="px-4 py-2 bg-success-bg text-success border border-success/20 rounded-xl text-xs font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>CASE RESOLVED</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Alert metadata & Heuristics details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2">
              Incident Overview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                  <span className="text-muted">Severity Classification</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                  <span className="text-muted">Assigned Investigator</span>
                  <span className="font-semibold text-text-primary flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-muted" />
                    <span>{alert.assignedTo ? alert.assignedTo.email : 'Unassigned'}</span>
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                  <span className="text-muted">Incident Trigger Date</span>
                  <span className="font-semibold text-text-primary flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-muted" />
                    <span>{formatDateTime(alert.createdAt)}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                  <span className="text-muted">Engine Score Contribution</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${getRiskBadgeClass(alert.riskScore)}`}>
                    {alert.riskScore}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                  <span className="text-muted">Linked Account Node</span>
                  {alert.accountId ? (
                    <Link 
                      to={`/accounts/${alert.accountId._id}`}
                      className="font-mono font-bold text-text-primary hover:underline"
                    >
                      {alert.accountId.accountNumber}
                    </Link>
                  ) : (
                    <span className="text-muted">N/A</span>
                  )}
                </div>
                <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                  <span className="text-muted">Case Status</span>
                  <span className="font-bold text-text-primary">
                    {alert.resolved ? 'Resolved' : 'Active / Pending Review'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
                Trigger Description
              </span>
              <p className="p-3 bg-bg rounded-lg text-xs leading-relaxed text-text-primary border border-accent/5">
                {alert.description}
              </p>
            </div>
          </div>

          {/* C++ engine signal outputs */}
          {scoreData && (
            <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2 flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-accent" />
                <span>C++ Fraud Engine Analysis Signals</span>
              </h3>

              <div className="space-y-3">
                {scoreData.signals.map((sig, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-bg rounded-lg border border-accent/5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-text-primary uppercase tracking-tight flex items-center space-x-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 text-danger" />
                        <span>{sig.type.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-muted text-[11px] leading-relaxed">{sig.detail}</p>
                    </div>
                    
                    <span className="px-2 py-1 bg-danger-bg text-danger font-black rounded-lg border border-danger/10 text-right whitespace-nowrap self-start md:self-center">
                      +{sig.score} points
                    </span>
                  </div>
                ))}

                {scoreData.signals.length === 0 && (
                  <p className="text-center py-6 text-xs text-muted">
                    No explicit signal vectors flags were attached to this score.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Transaction auditing & decision tools */}
        <div className="space-y-6 text-xs">
          
          {/* Associated transaction detail */}
          <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2">
              Transaction Audit
            </h3>

            {alert.transactionId ? (
              <div className="space-y-3">
                {/* Transaction metadata */}
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                    <span className="text-muted">Transaction Amount</span>
                    <span className="font-bold text-text-primary text-sm">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                    <span className="text-muted">Source Account ID</span>
                    <span className="font-mono font-bold text-text-primary">
                      {tx.fromAccountId?.accountNumber || 'EXTERNAL'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                    <span className="text-muted">Destination Account ID</span>
                    <span className="font-mono font-bold text-text-primary">
                      {tx.toAccountId?.accountNumber || 'EXTERNAL'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                    <span className="text-muted">Merchant</span>
                    <span className="font-semibold text-text-primary">{tx.merchantName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                    <span className="text-muted">Location / Device</span>
                    <span className="text-text-primary text-[10px]">
                      {tx.location || 'Unknown'} / {tx.deviceId || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-accent/[0.02]">
                    <span className="text-muted">Decision status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getDecisionBadgeClass(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>

                {/* Status mutation controls */}
                {isManagerOrAdmin && (
                  <div className="pt-3 border-t border-accent/5 space-y-2">
                    <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
                      Override Transaction Status
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleTransactionStatusUpdate('completed')}
                        disabled={statusUpdating || tx.status === 'completed'}
                        className="py-1.5 bg-success-bg hover:bg-success/10 text-success border border-success/20 font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleTransactionStatusUpdate('flagged')}
                        disabled={statusUpdating || tx.status === 'flagged'}
                        className="py-1.5 bg-warning-bg hover:bg-warning/10 text-warning border border-warning/20 font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleTransactionStatusUpdate('blocked')}
                        disabled={statusUpdating || tx.status === 'blocked'}
                        className="py-1.5 bg-danger-bg hover:bg-danger/10 text-danger border border-danger/20 font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        Block
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted">
                No transaction details linked to this alert model.
              </div>
            )}
          </div>

          {/* Graph heuristics summary */}
          <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2">
              Graph Context
            </h3>
            
            <p className="text-[11px] text-muted leading-relaxed">
              This node has been evaluated using standard DFS/BFS structures inside the C++ engine to scan cyclic loops and transaction routing depths.
            </p>

            <Link 
              to="/network"
              className="w-full py-2 bg-accent hover:bg-accent/90 text-surface text-center font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-1"
            >
              <span>View Network Graph</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AlertDetail;
