import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import api from '../services/api';
import TransactionTable, { formatINR } from '../components/TransactionTable';
import AlertCard from '../components/AlertCard';
import { 
  User, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  ArrowLeft, 
  DollarSign, 
  Lock, 
  Unlock,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDateTime } from '../utils/riskUtils';

export const AccountDetails = () => {
  const { accountId } = useParams();
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [activeTab, setActiveTab] = useState('transactions');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Pagination for transactions list within Tab 1
  const [txPage, setTxPage] = useState(1);
  const txsPerPage = 10;

  const fetchProfileDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/accounts/${accountId}`);
      const data = response.data.data;
      setAccount(data.account || null);
      setTransactions(data.transactions || []);
      setAlerts(data.alerts || []);
      setPatterns(data.patterns || []);
    } catch (err) {
      console.error('Failed to load account details:', err.message);
      showToast('danger', 'Load Failure', 'Could not retrieve account variables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [accountId]);

  const handleToggleFreeze = async (newStatus) => {
    if (!isAdmin) {
      showToast('warning', 'Access Denied', 'Only administrators can toggle freeze states.');
      return;
    }
    const actionLabel = newStatus === 'frozen' ? 'freeze' : 'unfreeze';
    if (window.confirm(`Are you sure you want to ${actionLabel} this account node?`)) {
      setUpdatingStatus(true);
      try {
        const response = await api.patch(`/api/accounts/${accountId}/status`, { status: newStatus });
        setAccount(response.data.data);
        showToast('success', 'Status Synchronized', `Account state set to ${newStatus.toUpperCase()}.`);
        
        // Dispatch custom global refresh triggers
        window.dispatchEvent(new Event('refresh-dashboard-data'));
      } catch (err) {
        showToast('danger', 'Update Failed', err.response?.data?.message || 'Error updating status.');
      } finally {
        setUpdatingStatus(false);
      }
    }
  };

  if (loading && !account) {
    return (
      <div className="bg-surface border border-accent/5 p-16 text-center text-muted rounded-xl">
        <div className="flex items-center justify-center space-x-2 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Retrieving node variables...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="bg-surface border border-accent/5 p-16 text-center text-muted rounded-xl space-y-4 text-xs font-semibold">
        <ShieldAlert className="w-12 h-12 text-danger mx-auto" />
        <p>Account node was not located in active graph segments.</p>
        <Link to="/" className="text-info hover:underline">&larr; Return to Overview</Link>
      </div>
    );
  }

  // Risk Score Gauge Calculations
  const risk = account.riskScore || 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (risk / 100) * circumference;

  let gaugeColor = '#1A7A4A'; // success (green)
  if (risk >= 60) gaugeColor = '#D93025'; // danger (red)
  else if (risk >= 30) gaugeColor = '#C27B00'; // warning (orange/yellow)

  // Tab 1 Pagination Slice
  const indexOfLastTx = txPage * txsPerPage;
  const indexOfFirstTx = indexOfLastTx - txsPerPage;
  const paginatedTxs = transactions.slice(indexOfFirstTx, indexOfLastTx);
  const totalTxPages = Math.ceil(transactions.length / txsPerPage);

  return (
    <div className="space-y-6">
      
      {/* Return header */}
      <div className="space-y-1 pb-4 border-b border-accent/5 shrink-0">
        <Link to="/" className="text-xs text-muted hover:text-text-primary flex items-center space-x-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Command Center</span>
        </Link>
      </div>

      {/* HEADER SECTION - Risk Profiles, Status, Action Buttons */}
      <div className="bg-surface border border-accent/5 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
        
        {/* Left side details */}
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left min-w-0 flex-1">
          <div className="w-12 h-12 bg-accent/5 text-text-primary border border-accent/10 rounded-full flex items-center justify-center shrink-0 shadow-inner">
            <User className="w-6 h-6" />
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex items-center flex-wrap gap-2 justify-center sm:justify-start">
              <h2 className="text-xl font-bold text-text-primary font-mono">{account.accountNumber}</h2>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                account.status === 'active' ? 'bg-success-bg text-success border border-success/15' : 'bg-danger-bg text-danger border border-danger/15'
              }`}>
                {account.status}
              </span>
            </div>
            
            <div className="text-[10px] text-muted flex items-center space-x-4 flex-wrap justify-center sm:justify-start">
              <span>Transacted count: <span className="font-bold text-text-primary">{account.totalTransactions}</span></span>
              <span>Updated: {formatDateTime(account.lastActiveAt)}</span>
            </div>

            <div className="pt-1 text-xs">
              <span className="text-muted block text-[9px] uppercase font-bold tracking-wider mb-0.5">Account Balance</span>
              <span className="text-xl font-black text-text-primary font-mono">{formatINR(account.balance)}</span>
            </div>
          </div>
        </div>

        {/* Middle circular risk gauge */}
        <div className="flex items-center space-x-4 border-y md:border-y-0 md:border-x border-accent/5 py-4 md:py-0 px-6 shrink-0">
          <div className="relative flex items-center justify-center">
            <svg className="w-20 h-20 transform -rotate-90">
              {/* Back track */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-accent/5 fill-transparent"
                strokeWidth="6.5"
              />
              {/* Animated fill */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="transparent"
                stroke={gaugeColor}
                strokeWidth="6.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-base font-black text-text-primary">{risk}%</span>
              <span className="text-[7.5px] font-bold text-muted uppercase tracking-wider">Risk</span>
            </div>
          </div>
        </div>

        {/* Right buttons (Freeze / Unfreeze - admin only) */}
        <div className="shrink-0">
          {isAdmin ? (
            account.status === 'active' ? (
              <button
                onClick={() => handleToggleFreeze('frozen')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-danger hover:bg-danger/90 text-surface text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Freeze Account</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleFreeze('active')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-success hover:bg-success/90 text-surface text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unfreeze Account</span>
              </button>
            )
          ) : (
            <div className="text-[10px] text-muted max-w-[150px] leading-relaxed border border-accent/5 p-2 bg-bg/30 rounded-xl">
              * Freeze controls are locked under Administrator clearances.
            </div>
          )}
        </div>
      </div>

      {/* Tabs selectors bar */}
      <div className="flex border-b border-accent/5 gap-4 text-xs font-bold shrink-0">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-2.5 px-1 tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'transactions' ? 'border-accent text-text-primary' : 'border-transparent text-muted hover:text-text-primary'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`pb-2.5 px-1 tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'patterns' ? 'border-accent text-text-primary' : 'border-transparent text-muted hover:text-text-primary'
          }`}
        >
          Fraud Patterns
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-2.5 px-1 tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'alerts' ? 'border-accent text-text-primary' : 'border-transparent text-muted hover:text-text-primary'
          }`}
        >
          Alert History
        </button>
      </div>

      {/* Tab Contents */}
      <div className="animate-fade-in">
        {/* Tab 1 — Transactions List */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-4.5">
              <TransactionTable transactions={paginatedTxs} isLoading={false} />

              {/* Transactions Tab Pagination */}
              {totalTxPages > 1 && (
                <div className="flex items-center justify-between border-t border-accent/5 pt-4 mt-4 text-xs">
                  <span className="text-muted">
                    Page <span className="font-bold text-text-primary">{txPage}</span> of <span className="font-bold text-text-primary">{totalTxPages}</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setTxPage(prev => Math.max(1, prev - 1))}
                      disabled={txPage === 1}
                      className="p-1 border border-accent/10 rounded-lg hover:bg-bg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTxPage(prev => Math.min(totalTxPages, prev + 1))}
                      disabled={txPage === totalTxPages}
                      className="p-1 border border-accent/10 rounded-lg hover:bg-bg disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2 — Fraud Patterns List */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((pat) => {
                const meta = pat.patternMeta || {};
                const isCycle = pat.type === 'CYCLE';
                const isSmurfing = pat.type === 'SMURFING';
                const isDrain = pat.type === 'DRAIN';

                const detailStr = meta.detail || meta.description || pat.description || '';
                
                let involvedAccounts = meta.involvedAccounts;
                if (isCycle && !involvedAccounts && detailStr) {
                  const match = detailStr.match(/accounts:\s*(.+)$/i);
                  if (match && match[1]) {
                    involvedAccounts = match[1].split('->').map(s => s.trim());
                  }
                }
                
                let recipientCount = meta.recipientCount;
                let totalAmount = meta.totalAmount;
                if (isSmurfing && detailStr) {
                  if (!recipientCount) {
                    const match = detailStr.match(/to\s+(\d+)\s+unique/i);
                    if (match) recipientCount = parseInt(match[1], 10);
                  }
                  if (!totalAmount) {
                    const match = detailStr.match(/totaling\s+([\d.]+)/i);
                    if (match) totalAmount = parseFloat(match[1]);
                  }
                }
                
                let drainRatio = meta.drainRatio;
                let outgoingAmount = meta.outgoingAmount;
                if (isDrain && detailStr) {
                  if (!drainRatio) {
                    const match = detailStr.match(/drains\s+([\d.]+)%/i);
                    if (match) drainRatio = parseFloat(match[1]) / 100;
                  }
                  if (!outgoingAmount) {
                    const match = detailStr.match(/Outgoing\s+total\s+([\d.]+)/i);
                    if (match) outgoingAmount = parseFloat(match[1]);
                  }
                }

                return (
                  <div 
                    key={pat._id} 
                    className="bg-surface border border-accent/5 p-4 rounded-xl shadow-sm space-y-3 animate-fade-in flex flex-col justify-between text-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-text-primary uppercase tracking-wider bg-accent/5 px-2.5 py-0.5 rounded-lg border border-accent/10">
                          {pat.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-muted">{formatDateTime(pat.timestamp)}</span>
                      </div>

                      {/* Custom metadata display according to pattern type */}
                      {isCycle && involvedAccounts && (
                        <div className="space-y-1 bg-bg/30 p-2.5 rounded-lg border border-accent/5 font-mono text-[10px]">
                          <span className="block font-bold text-muted uppercase text-[8px] tracking-wider mb-1">Cycle Path Sequence</span>
                          <div className="flex items-center flex-wrap gap-1">
                            {involvedAccounts.map((node, i) => (
                              <React.Fragment key={i}>
                                <span className="font-bold text-text-primary">{node}</span>
                                {i < involvedAccounts.length - 1 && <span className="text-muted">&rarr;</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}

                      {isSmurfing && (
                        <div className="grid grid-cols-2 gap-2 bg-bg/30 p-2.5 rounded-lg border border-accent/5">
                          <div>
                            <span className="block text-muted text-[8px] uppercase tracking-wider">Recipients</span>
                            <span className="font-extrabold text-text-primary">{recipientCount || 0} nodes</span>
                          </div>
                          <div>
                            <span className="block text-muted text-[8px] uppercase tracking-wider">Total Transferred</span>
                            <span className="font-extrabold text-text-primary">{formatINR(totalAmount || 0)}</span>
                          </div>
                        </div>
                      )}

                      {isDrain && (
                        <div className="grid grid-cols-2 gap-2 bg-bg/30 p-2.5 rounded-lg border border-accent/5">
                          <div>
                            <span className="block text-muted text-[8px] uppercase tracking-wider">Drain Ratio</span>
                            <span className="font-extrabold text-danger">{drainRatio ? `${(drainRatio * 100).toFixed(0)}%` : '0%'}</span>
                          </div>
                          <div>
                            <span className="block text-muted text-[8px] uppercase tracking-wider">Outgoing amount</span>
                            <span className="font-extrabold text-text-primary">{formatINR(outgoingAmount || 0)}</span>
                          </div>
                        </div>
                      )}

                      <p className="text-muted leading-relaxed">
                        {detailStr || 'Graph heuristic indicator flagged by analysis engine.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-accent/5 font-black text-text-primary flex justify-between items-center text-[10px]">
                      <span>Heuristics Weight Contribution:</span>
                      <span className="text-danger">+{pat.riskScore}</span>
                    </div>
                  </div>
                );
              })}
              {patterns.length === 0 && (
                <div className="col-span-2 bg-surface border border-accent/5 p-12 text-center text-muted rounded-xl flex flex-col items-center justify-center space-y-2">
                  <FileText className="w-10 h-10 opacity-30" />
                  <span>No fraud engine patterns flagged for this account node.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3 — Alert History List */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((item) => (
                <div key={item._id} className={item.resolved ? 'opacity-50 grayscale-[40%]' : ''}>
                  <AlertCard
                    alert={item}
                    compact={true}
                  />
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="col-span-2 bg-surface border border-accent/5 p-12 text-center text-muted rounded-xl flex flex-col items-center justify-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-success opacity-55" />
                  <span>Excellent. No historical alerts exist for this account.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDetails;
