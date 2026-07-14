import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from './ToastNotification';
import { 
  X, 
  ArrowRight, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  UserCheck 
} from 'lucide-react';

/**
 * Formats a numeric value as standard INR currency (₹).
 * @param {number} amount 
 * @returns {string}
 */
export const formatINR = (amount) => {
  if (typeof amount !== 'number') return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

export const TransactionTable = ({ transactions, isLoading, onRowClick }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedTx, setSelectedTx] = useState(null);
  const [associatedAlert, setAssociatedAlert] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Fetch associated alert when a transaction is loaded in the drawer
  useEffect(() => {
    const fetchAssociatedAlert = async () => {
      if (!selectedTx) {
        setAssociatedAlert(null);
        return;
      }
      try {
        const response = await api.get('/api/alerts', { 
          params: { transactionId: selectedTx._id, limit: 1 } 
        });
        if (response.data.data && response.data.data.length > 0) {
          setAssociatedAlert(response.data.data[0]);
        } else {
          setAssociatedAlert(null);
        }
      } catch (err) {
        console.error('Failed to locate linked alert ticket:', err.message);
        setAssociatedAlert(null);
      }
    };

    fetchAssociatedAlert();
  }, [selectedTx]);

  const handleRowClick = (tx) => {
    setSelectedTx(tx);
    if (onRowClick) onRowClick(tx);
  };

  const handleResolveAlert = async () => {
    if (!associatedAlert) return;
    setResolving(true);
    try {
      await api.patch(`/api/alerts/${associatedAlert._id}/resolve`);
      showToast('success', 'Alert Resolved', `Transaction case resolved successfully.`);
      // Update transaction status locally
      setSelectedTx(prev => ({ ...prev, status: 'completed' }));
      setAssociatedAlert(prev => ({ ...prev, resolved: true }));
      // Dispatch custom global refresh triggers
      window.dispatchEvent(new Event('refresh-dashboard-data'));
    } catch (err) {
      showToast('danger', 'Resolution Failed', err.response?.data?.message || 'Error resolving case.');
    } finally {
      setResolving(false);
    }
  };

  // Helper to color risk score numbers
  const getRiskScoreColor = (score) => {
    if (score > 60) return 'text-danger font-black';
    if (score > 40) return 'text-warning font-black';
    return 'text-success font-semibold';
  };

  return (
    <div className="relative">
      {/* Scrollable Table View */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-bg/40 border-b border-accent/5 text-[9px] font-bold text-muted uppercase tracking-wider">
              <th className="py-2.5 px-3">TX ID</th>
              <th className="py-2.5 px-3">From</th>
              <th className="py-2.5 px-3">To</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Risk Score</th>
              <th className="py-2.5 px-3 text-right">Time</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-accent/5">
            {isLoading ? (
              [...Array(5)].map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan="8" className="py-4 px-3">
                    <div className="h-4 bg-accent/5 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : transactions.length > 0 ? (
              transactions.map((tx) => {
                const txIdDisplay = tx.transactionId || `#${tx._id.substring(tx._id.length - 8).toUpperCase()}`;
                const fromAcc = tx.fromAccount || tx.fromAccountId || {};
                const toAcc = tx.toAccount || tx.toAccountId || {};
                const fromNo = fromAcc.accountNumber || 'EXTERNAL';
                const toNo = toAcc.accountNumber || 'EXTERNAL';
                const score = tx.fraudScoreId?.totalScore || tx.fraudScore?.totalScore || 0;

                return (
                  <tr
                    key={tx._id}
                    onClick={() => handleRowClick(tx)}
                    className="hover:bg-bg/25 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-text-primary whitespace-nowrap">
                      {txIdDisplay}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted">{fromNo}</td>
                    <td className="py-2.5 px-3 font-mono text-muted">{toNo}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-text-primary whitespace-nowrap">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                        tx.status === 'completed' ? 'bg-success-bg text-success' :
                        tx.status === 'flagged' ? 'bg-warning-bg text-warning' :
                        tx.status === 'blocked' ? 'bg-danger-bg text-danger' :
                        'bg-info-bg text-info'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 text-center ${getRiskScoreColor(score)}`}>
                      {score}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(tx);
                        }}
                        className="text-[10px] text-info hover:underline font-bold"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="py-16 text-center text-muted">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <ShieldAlert className="w-12 h-12 text-muted opacity-45" />
                    <span className="text-sm font-semibold">No transactions match the specified filters.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out Drawer Overlay */}
      {selectedTx && (
        <>
          {/* Drawer Backdrop */}
          <div
            onClick={() => setSelectedTx(null)}
            className="fixed inset-0 bg-accent/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          />

          {/* Slide-in from right Drawer Container */}
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col h-full transform translate-x-0 transition-transform duration-300 animate-fade-in text-xs border-l border-accent/5">
            {/* Header */}
            <div className="p-4 border-b border-accent/5 bg-bg/20 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Transaction Auditing</span>
                <h3 className="text-sm font-bold text-text-primary uppercase font-mono">
                  {selectedTx.transactionId || `#${selectedTx._id.toUpperCase()}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 hover:bg-black/5 rounded-lg text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Amount and Basic details */}
              <div className="space-y-3.5 bg-bg/30 p-4 border border-accent/5 rounded-xl">
                <div className="text-center py-2 space-y-1">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Amount Transferred</span>
                  <div className="text-2xl font-black text-text-primary">{formatINR(selectedTx.amount)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-accent/5 pt-3">
                  <div>
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-0.5">Source Account</span>
                    {selectedTx.fromAccount || selectedTx.fromAccountId ? (
                      <Link
                        to={`/accounts/${(selectedTx.fromAccount || selectedTx.fromAccountId)._id}`}
                        onClick={() => setSelectedTx(null)}
                        className="font-mono font-bold text-text-primary hover:underline flex items-center gap-1"
                      >
                        <span>{(selectedTx.fromAccount || selectedTx.fromAccountId).accountNumber}</span>
                        <ExternalLink className="w-3 h-3 text-muted" />
                      </Link>
                    ) : (
                      <span className="text-muted">EXTERNAL</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-0.5">Destination Account</span>
                    {selectedTx.toAccount || selectedTx.toAccountId ? (
                      <Link
                        to={`/accounts/${(selectedTx.toAccount || selectedTx.toAccountId)._id}`}
                        onClick={() => setSelectedTx(null)}
                        className="font-mono font-bold text-text-primary hover:underline flex items-center gap-1"
                      >
                        <span>{(selectedTx.toAccount || selectedTx.toAccountId).accountNumber}</span>
                        <ExternalLink className="w-3 h-3 text-muted" />
                      </Link>
                    ) : (
                      <span className="text-muted">EXTERNAL</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-accent/5 pt-3">
                  <div>
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-0.5">Timestamp</span>
                    <span className="font-semibold text-text-primary">
                      {formatDateTime(selectedTx.timestamp)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-0.5">Decision Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      selectedTx.status === 'completed' ? 'bg-success-bg text-success' :
                      selectedTx.status === 'flagged' ? 'bg-warning-bg text-warning' :
                      'bg-danger-bg text-danger'
                    }`}>
                      {selectedTx.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fraud score and C++ engine signals */}
              {selectedTx.fraudScoreId || selectedTx.fraudScore ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2">
                    Fraud Decision Matrix
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 bg-bg rounded-lg border border-accent/5 text-center">
                      <span className="text-[9px] font-bold text-muted uppercase block mb-1">Score</span>
                      <span className="text-base font-black text-text-primary">
                        {(selectedTx.fraudScoreId || selectedTx.fraudScore).totalScore}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-bg rounded-lg border border-accent/5 text-center">
                      <span className="text-[9px] font-bold text-muted uppercase block mb-1">Severity</span>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-bold ${
                        (selectedTx.fraudScoreId || selectedTx.fraudScore).severity === 'CRITICAL' || 
                        (selectedTx.fraudScoreId || selectedTx.fraudScore).severity === 'HIGH'
                          ? 'bg-danger-bg text-danger'
                          : 'bg-warning-bg text-warning'
                      }`}>
                        {(selectedTx.fraudScoreId || selectedTx.fraudScore).severity || 'LOW'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-bg rounded-lg border border-accent/5 text-center">
                      <span className="text-[9px] font-bold text-muted uppercase block mb-1">Decision</span>
                      <span className="text-[10px] font-extrabold text-text-primary block uppercase truncate">
                        {(selectedTx.fraudScoreId || selectedTx.fraudScore).decision}
                      </span>
                    </div>
                  </div>

                  {/* Signals List */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Evaluation Vectors Flaggings
                    </span>
                    {((selectedTx.fraudScoreId || selectedTx.fraudScore).signals || []).map((sig, idx) => (
                      <div key={idx} className="p-3 bg-bg border border-accent/5 rounded-xl space-y-1.5 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-text-primary uppercase text-[9px] bg-accent/5 px-2 py-0.5 rounded border border-accent/5">
                            {sig.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-danger font-black text-[10px]">+{sig.score} Pts</span>
                        </div>
                        <p className="text-[10px] text-muted leading-relaxed">{sig.detail}</p>
                      </div>
                    ))}
                    {((selectedTx.fraudScoreId || selectedTx.fraudScore).signals || []).length === 0 && (
                      <div className="text-center py-4 text-muted border border-dashed border-accent/15 rounded-xl">
                        No signal exceptions flagged by engine logic.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted border border-dashed border-accent/15 rounded-xl">
                  No automated fraud score analysis mapped for this transaction.
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-accent/5 bg-bg/25 shrink-0 flex gap-3.5">
              {associatedAlert && !associatedAlert.resolved && (
                <button
                  onClick={handleResolveAlert}
                  disabled={resolving}
                  className="flex-1 py-2 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 text-xs"
                >
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{resolving ? 'Resolving...' : 'Resolve Alert'}</span>
                </button>
              )}
              {selectedTx.fromAccount || selectedTx.fromAccountId ? (
                <button
                  onClick={() => {
                    const id = (selectedTx.fromAccount || selectedTx.fromAccountId)._id;
                    setSelectedTx(null);
                    navigate(`/accounts/${id}`);
                  }}
                  className="flex-1 py-2 bg-surface hover:bg-bg border border-accent/10 text-text-primary font-semibold rounded-lg flex items-center justify-center space-x-1.5 text-xs transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-muted" />
                  <span>View Account</span>
                </button>
              ) : null}
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default TransactionTable;
