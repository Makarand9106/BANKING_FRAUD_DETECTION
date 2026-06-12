import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatCurrency } from '../utils/riskUtils';
import { 
  Zap, 
  RefreshCw, 
  Sparkles, 
  Info, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Play,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { useToast } from '../components/ToastNotification';

export const TransactionSimulator = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [progressMsg, setProgressMsg] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    timestamp: '',
    balance: '',
    lastActiveAt: '',
    merchantName: 'Google Play Store',
    deviceId: 'DEV-SIM-7721',
    location: 'Mumbai, MH'
  });

  // Result Card State
  const [result, setResult] = useState(null);
  const [rawJsonExpanded, setRawJsonExpanded] = useState(false);

  // Fetch accounts to populate presets and autofills
  const fetchAvailableAccounts = async () => {
    try {
      // Get top suspicious
      const resSusp = await api.get('/api/accounts/top-suspicious');
      const suspList = resSusp.data.data || [];
      
      // Get recent transactions to extract more accounts
      const resTx = await api.get('/api/transactions?limit=50');
      const txList = resTx.data.data || [];
      
      const accountMap = new Map();
      
      suspList.forEach(item => {
        if (item.account) accountMap.set(item.account._id, item.account);
      });
      
      txList.forEach(tx => {
        if (tx.fromAccount) accountMap.set(tx.fromAccount._id, tx.fromAccount);
        if (tx.toAccount) accountMap.set(tx.toAccount._id, tx.toAccount);
      });

      const uniqAccounts = Array.from(accountMap.values());
      setAccounts(uniqAccounts);
      
      // Default fill if empty
      if (uniqAccounts.length >= 2 && !formData.fromAccountId) {
        setFormData(prev => ({
          ...prev,
          fromAccountId: uniqAccounts[0]._id,
          toAccountId: uniqAccounts[1]._id,
          balance: uniqAccounts[0].balance.toString(),
          lastActiveAt: new Date(uniqAccounts[0].lastActiveAt).toISOString().slice(0, 16)
        }));
      }
    } catch (err) {
      console.error('Failed to load active simulator accounts:', err.message);
    }
  };

  useEffect(() => {
    // Default timestamp to now
    const nowLocal = new Date();
    nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
    setFormData(prev => ({
      ...prev,
      timestamp: nowLocal.toISOString().slice(0, 16)
    }));

    fetchAvailableAccounts();
  }, []);

  // Submit standard single transaction
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('warning', 'Validation Error', 'Please enter a valid transacting amount.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        merchantName: formData.merchantName,
        location: formData.location,
        deviceId: formData.deviceId,
        timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString()
      };

      if (formData.fromAccountId) payload.fromAccountId = formData.fromAccountId;
      if (formData.toAccountId) payload.toAccountId = formData.toAccountId;
      
      // Send context overrides if provided
      if (formData.balance !== '') payload.balance = parseFloat(formData.balance);
      if (formData.lastActiveAt !== '') payload.lastActiveAt = new Date(formData.lastActiveAt).toISOString();

      const res = await api.post('/api/transactions', payload);
      setResult(res.data.data);
      showToast('success', 'Transaction Ingested', `Risk Score: ${res.data.data.fraudScoreId?.totalScore || 0}%`);
      fetchAvailableAccounts();
    } catch (err) {
      showToast('danger', 'Ingestion Failed', err.response?.data?.message || 'Error processing transaction.');
    } finally {
      setLoading(false);
    }
  };

  // Run multi-transaction preset scenarios
  const runPreset = async (presetName) => {
    if (accounts.length < 3) {
      showToast('warning', 'Insufficient Data', 'Simulating presets requires seeding. Please ensure seed is executed first.');
      return;
    }

    setLoading(true);
    setResult(null);
    setActivePreset(presetName);
    
    try {
      const now = new Date();
      
      if (presetName === 'normal') {
        setProgressMsg('Simulating standard normal transaction...');
        const accA = accounts[0];
        const accB = accounts[1];
        
        const payload = {
          fromAccountId: accA._id,
          toAccountId: accB._id,
          amount: 2000,
          timestamp: now.toISOString(),
          balance: accA.balance,
          lastActiveAt: accA.lastActiveAt,
          merchantName: 'Starbucks Coffee',
          deviceId: 'DEV-SIM-NORMAL',
          location: 'New Delhi, IN'
        };

        const res = await api.post('/api/transactions', payload);
        setResult(res.data.data);
        showToast('success', 'Normal preset executed', 'Created standard completed transfer.');

      } else if (presetName === 'cycle') {
        setProgressMsg('Initiating 3-node cycle loop (A → B → C → A)...');
        const A = accounts[0];
        const B = accounts[1];
        const C = accounts[2];

        // step 1: A -> B
        setProgressMsg('Step 1/3: Sending ₹10,000 from ACC-A to ACC-B...');
        await api.post('/api/transactions', {
          fromAccountId: A._id,
          toAccountId: B._id,
          amount: 10000,
          timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
          merchantName: 'P2P Loop 1',
          deviceId: 'DEV-SIM-CYCLE'
        });

        // step 2: B -> C
        setProgressMsg('Step 2/3: Sending ₹9,500 from ACC-B to ACC-C...');
        await api.post('/api/transactions', {
          fromAccountId: B._id,
          toAccountId: C._id,
          amount: 9500,
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
          merchantName: 'P2P Loop 2',
          deviceId: 'DEV-SIM-CYCLE'
        });

        // step 3: C -> A (closes the loop)
        setProgressMsg('Step 3/3: Closing cycle loop sending ₹9,025 from ACC-C to ACC-A...');
        const res = await api.post('/api/transactions', {
          fromAccountId: C._id,
          toAccountId: A._id,
          amount: 9025,
          timestamp: now.toISOString(),
          merchantName: 'P2P Loop 3',
          deviceId: 'DEV-SIM-CYCLE'
        });

        setResult(res.data.data);
        showToast('success', 'Cycle loop presets executed', 'Cycle successfully ingested.');

      } else if (presetName === 'velocity') {
        setProgressMsg('Firing velocity spike: 11 sequential transfers in rapid succession...');
        const A = accounts[0];
        const B = accounts[1];
        
        let lastRes = null;
        for (let i = 1; i <= 11; i++) {
          setProgressMsg(`Streaming transfer ${i}/11 to C++ fraud-engine...`);
          lastRes = await api.post('/api/transactions', {
            fromAccountId: A._id,
            toAccountId: B._id,
            amount: 500,
            timestamp: new Date(now.getTime() + i * 1000).toISOString(), // 1s apart
            merchantName: 'Micro-transfers Rapid Fire',
            deviceId: 'DEV-SIM-VELOCITY'
          });
        }
        
        setResult(lastRes.data.data);
        showToast('success', 'Velocity test complete', 'Spammed 11 sequential transfers.');

      } else if (presetName === 'smurfing') {
        setProgressMsg('Spawning Smurfing sequence: sending ₹9800 to 7 receivers in 60 mins...');
        const sender = accounts[0];
        
        if (accounts.length < 8) {
          showToast('warning', 'Need more accounts', 'Requires at least 8 seeded accounts to run smurfing.');
          return;
        }

        let lastRes = null;
        for (let i = 1; i <= 7; i++) {
          const rec = accounts[i];
          setProgressMsg(`Dispatching structured structuring transfer ${i}/7 to ${rec.accountNumber}...`);
          lastRes = await api.post('/api/transactions', {
            fromAccountId: sender._id,
            toAccountId: rec._id,
            amount: 9800,
            timestamp: new Date(now.getTime() - (7 - i) * 5 * 60 * 1000).toISOString(),
            merchantName: 'P2P Structuring Wire',
            deviceId: 'DEV-SIM-SMURF'
          });
        }

        setResult(lastRes.data.data);
        showToast('success', 'Smurfing sequence finished', '7 structured wire transfers ingested.');

      } else if (presetName === 'dormant') {
        setProgressMsg('Testing dormant reactivation parameters...');
        const accA = accounts[0];
        
        // Sets lastActiveAt override to 100 days ago
        const dormantDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
        
        const payload = {
          fromAccountId: accA._id,
          toAccountId: accounts[1]._id,
          amount: 25000,
          timestamp: now.toISOString(),
          balance: accA.balance,
          lastActiveAt: dormantDate.toISOString(),
          merchantName: 'High Value Reactivation Wire',
          deviceId: 'DEV-SIM-DORMANT',
          location: 'Suspicious IP'
        };

        const res = await api.post('/api/transactions', payload);
        setResult(res.data.data);
        showToast('success', 'Dormant account preset executed', 'Dormant activation analyzed.');

      } else if (presetName === 'drain') {
        setProgressMsg('Simulating balance drain scenario...');
        const accA = accounts[0];
        
        // Ensure account has balance
        let balanceVal = accA.balance;
        if (balanceVal < 100000) {
          balanceVal = 120000;
        }

        const drainAmount = Math.floor(balanceVal * 0.83); // 83% drain ratio

        const payload = {
          fromAccountId: accA._id,
          toAccountId: accounts[1]._id,
          amount: drainAmount,
          timestamp: now.toISOString(),
          balance: balanceVal,
          lastActiveAt: accA.lastActiveAt,
          merchantName: 'Asset Liquidation Transfer',
          deviceId: 'DEV-SIM-DRAIN',
          location: 'Unknown Device Location'
        };

        const res = await api.post('/api/transactions', payload);
        setResult(res.data.data);
        showToast('success', 'Drain scenario executed', 'Drained 83% of total account balance.');
      }

      fetchAvailableAccounts();
    } catch (err) {
      showToast('danger', 'Simulation Run Failed', err.response?.data?.message || 'Error executing preset.');
    } finally {
      setLoading(false);
      setActivePreset(null);
      setProgressMsg('');
    }
  };

  // Color mappings for risk rating
  const getRiskScoreColor = (score) => {
    if (score >= 70) return 'text-danger';
    if (score >= 40) return 'text-warning';
    return 'text-success';
  };

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'BLOCK':
        return 'bg-danger-bg text-danger border border-danger/15';
      case 'REVIEW':
        return 'bg-warning-bg text-warning border border-warning/15';
      default:
        return 'bg-success-bg text-success border border-success/15';
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-danger text-surface font-extrabold';
      case 'MEDIUM':
        return 'bg-warning text-surface font-extrabold';
      default:
        return 'bg-info text-surface font-extrabold';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in text-xs">
      
      {/* Header */}
      <div className="pb-5 border-b border-accent/5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center space-x-2">
          <Zap className="w-6 h-6 text-warning" />
          <span>Interactive Transaction Ingestion Simulator</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Manually ingest transaction telemetry or run multi-transaction presets to test real-time graph heuristics.
        </p>
      </div>

      {/* Preset Scenarios Chip Bar */}
      <div className="bg-surface border border-accent/5 rounded-2xl p-5 shadow-sm space-y-3">
        <span className="font-bold text-[10px] text-muted uppercase tracking-wider block">Run Preset Simulation Scenarios</span>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runPreset('normal')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full border border-accent/10 font-bold transition-all flex items-center space-x-1 ${
              activePreset === 'normal' ? 'bg-accent text-surface' : 'bg-surface hover:bg-bg text-text-primary'
            }`}
          >
            <Play className="w-3 h-3 shrink-0" />
            <span>Normal Transaction</span>
          </button>

          <button
            onClick={() => runPreset('cycle')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full border border-accent/10 font-bold transition-all flex items-center space-x-1 ${
              activePreset === 'cycle' ? 'bg-accent text-surface' : 'bg-surface hover:bg-bg text-text-primary'
            }`}
          >
            <Play className="w-3 h-3 shrink-0" />
            <span>Cycle Pattern</span>
          </button>

          <button
            onClick={() => runPreset('velocity')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full border border-accent/10 font-bold transition-all flex items-center space-x-1 ${
              activePreset === 'velocity' ? 'bg-accent text-surface' : 'bg-surface hover:bg-bg text-text-primary'
            }`}
          >
            <Play className="w-3 h-3 shrink-0" />
            <span>Velocity Test</span>
          </button>

          <button
            onClick={() => runPreset('smurfing')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full border border-accent/10 font-bold transition-all flex items-center space-x-1 ${
              activePreset === 'smurfing' ? 'bg-accent text-surface' : 'bg-surface hover:bg-bg text-text-primary'
            }`}
          >
            <Play className="w-3 h-3 shrink-0" />
            <span>Smurfing Test</span>
          </button>

          <button
            onClick={() => runPreset('dormant')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full border border-accent/10 font-bold transition-all flex items-center space-x-1 ${
              activePreset === 'dormant' ? 'bg-accent text-surface' : 'bg-surface hover:bg-bg text-text-primary'
            }`}
          >
            <Play className="w-3 h-3 shrink-0" />
            <span>Dormant Account</span>
          </button>

          <button
            onClick={() => runPreset('drain')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full border border-accent/10 font-bold transition-all flex items-center space-x-1 ${
              activePreset === 'drain' ? 'bg-accent text-surface' : 'bg-surface hover:bg-bg text-text-primary'
            }`}
          >
            <Play className="w-3 h-3 shrink-0" />
            <span>Balance Drain</span>
          </button>
        </div>

        {progressMsg && (
          <div className="pt-2 flex items-center space-x-2 text-info font-mono text-[10px] animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{progressMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* FORM PANEL */}
        <div className="md:col-span-2 bg-surface border border-accent/5 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-warning" />
            <span>Ingest Live Transaction</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Source Account ID (Mongoose ObjectId)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 60c72b2f9b1d8e2568cf181b"
                  value={formData.fromAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromAccountId: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Destination Account ID (Mongoose ObjectId)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 60c72b2f9b1d8e2568cf181c"
                  value={formData.toAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, toAccountId: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Transfer Amount (₹)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="4500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-7 pr-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Ingestion Timestamp</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.timestamp}
                  onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Overrides block for C++ engine context */}
            <div className="bg-bg/40 p-4 rounded-xl border border-accent/5 space-y-4">
              <span className="font-bold text-[9px] text-muted uppercase tracking-wider block">Engine Context Overrides (Optional simulation)</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5">Simulate Source Balance (₹)</label>
                  <input
                    type="number"
                    placeholder="Auto-fetched current balance"
                    value={formData.balance}
                    onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5">Simulate Source Last Active</label>
                  <input
                    type="datetime-local"
                    value={formData.lastActiveAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastActiveAt: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5">Merchant Name</label>
                <input
                  type="text"
                  required
                  value={formData.merchantName}
                  onChange={(e) => setFormData(prev => ({ ...prev, merchantName: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5">Device ID</label>
                <input
                  type="text"
                  required
                  value={formData.deviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-bg text-text-primary text-xs border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5">Location</label>
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
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-surface text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Invoking compiled C++ fraud detection daemon...</span>
                </>
              ) : (
                <span>Simulate Ingestion</span>
              )}
            </button>
          </form>
        </div>

        {/* QUICKFILL SIDEBAR */}
        <div className="bg-surface border border-accent/5 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-[540px]">
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-info" />
              <span>Suspicious Accounts Quickfill</span>
            </h4>
            <p className="text-[10px] text-muted leading-relaxed">
              Auto-fill parameters instantly using valid nodes fetched from DB.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {accounts.map((acc) => (
              <div key={acc._id} className="p-2.5 bg-bg/50 hover:bg-bg rounded-xl border border-accent/5 space-y-2 transition-colors">
                <div className="flex justify-between font-mono font-bold">
                  <span>{acc.accountNumber}</span>
                  <span className="text-danger">{acc.riskScore}% Risk</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted">
                  <span>Balance: {formatCurrency(acc.balance)}</span>
                </div>
                <div className="flex items-center space-x-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      fromAccountId: acc._id,
                      balance: acc.balance.toString(),
                      lastActiveAt: new Date(acc.lastActiveAt).toISOString().slice(0, 16)
                    }))}
                    className="flex-1 py-1 bg-surface hover:bg-accent/5 text-[9px] font-bold rounded text-text-primary border border-accent/10"
                  >
                    As Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, toAccountId: acc._id }))}
                    className="flex-1 py-1 bg-surface hover:bg-accent/5 text-[9px] font-bold rounded text-text-primary border border-accent/10"
                  >
                    As Dest
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="text-center py-12 text-muted">
                No active accounts located. Ensure database is seeded.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-accent/5 text-[9px] text-muted leading-relaxed flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <span>Context variables bypass checking logic to simulate risk scenarios.</span>
          </div>
        </div>

      </div>

      {/* RESULT CARD */}
      {result && (
        <div className="bg-surface border border-accent/5 rounded-2xl p-6 shadow-sm animate-fade-in space-y-5">
          <div className="flex justify-between items-center border-b border-accent/5 pb-3">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
              <span>Ingestion Results</span>
            </h3>
            <span className="text-[10px] text-muted font-mono">
              Tx ID: #{result._id.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            
            {/* Risk rating */}
            <div className="bg-bg/25 border border-accent/5 rounded-2xl p-4.5 space-y-1.5 flex flex-col justify-center">
              <span className="block text-[8px] font-bold text-muted uppercase tracking-wider">Computed Risk Score</span>
              <span className={`text-3xl font-black ${getRiskScoreColor(result.fraudScoreId?.totalScore || 0)}`}>
                {result.fraudScoreId?.totalScore || 0}%
              </span>
            </div>

            {/* Severity */}
            <div className="bg-bg/25 border border-accent/5 rounded-2xl p-4.5 space-y-2.5 flex flex-col justify-center items-center">
              <span className="block text-[8px] font-bold text-muted uppercase tracking-wider">Threat Severity</span>
              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${getSeverityBadge(result.fraudScoreId?.severity)}`}>
                {result.fraudScoreId?.severity || 'NONE'}
              </span>
            </div>

            {/* Decision */}
            <div className="bg-bg/25 border border-accent/5 rounded-2xl p-4.5 space-y-2.5 flex flex-col justify-center items-center">
              <span className="block text-[8px] font-bold text-muted uppercase tracking-wider">Engine Action Decision</span>
              <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase ${getDecisionBadge(result.status.toUpperCase() === 'BLOCKED' ? 'BLOCK' : (result.status.toUpperCase() === 'FLAGGED' ? 'REVIEW' : 'APPROVE'))}`}>
                {result.status.toUpperCase() === 'BLOCKED' ? 'BLOCK' : (result.status.toUpperCase() === 'FLAGGED' ? 'REVIEW' : 'APPROVE')}
              </span>
            </div>

          </div>

          {/* Triggered Signals List */}
          <div className="space-y-2.5">
            <span className="font-bold text-[9px] text-muted uppercase tracking-wider block">Triggered Heuristics Signals ({result.fraudScoreId?.signals?.length || 0})</span>
            
            <div className="space-y-2">
              {result.fraudScoreId?.signals?.map((sig, idx) => (
                <div key={idx} className="p-3.5 bg-bg/50 border border-accent/5 rounded-xl flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/5 border border-accent/15 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-text-primary">+{sig.score}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-[10px] uppercase text-text-primary">{sig.type}</span>
                    <p className="text-muted leading-relaxed">{sig.detail || 'Contribution heuristics contributor flagged.'}</p>
                  </div>
                </div>
              ))}
              {(!result.fraudScoreId?.signals || result.fraudScoreId.signals.length === 0) && (
                <div className="text-center py-4 bg-bg/10 rounded-xl text-muted">
                  No fraud heuristics triggered. Clean transaction trace.
                </div>
              )}
            </div>
          </div>

          {/* TopK accounts list */}
          {result.fraudScoreId && (
            <div className="space-y-2.5 pt-1">
              <span className="font-bold text-[9px] text-muted uppercase tracking-wider block">Top Suspicious Node Heap Updates</span>
              
              <div className="flex flex-wrap gap-2">
                {accounts.slice(0, 5).map((acc, idx) => (
                  <div key={acc._id} className="px-3 py-1.5 bg-bg border border-accent/5 rounded-lg font-semibold flex items-center space-x-2">
                    <span className="text-muted font-mono">{idx+1}.</span>
                    <span className="font-mono text-text-primary">{acc.accountNumber}</span>
                    <span className="text-danger font-bold">({acc.riskScore}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON expandable */}
          <div className="border-t border-accent/5 pt-4">
            <button
              onClick={() => setRawJsonExpanded(!rawJsonExpanded)}
              className="flex items-center space-x-1 text-muted hover:text-text-primary font-bold"
            >
              <span>{rawJsonExpanded ? 'Hide Raw Transaction JSON' : 'Show Raw Transaction JSON'}</span>
              {rawJsonExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {rawJsonExpanded && (
              <pre className="mt-3 p-4 bg-bg text-text-primary text-[10px] rounded-xl overflow-x-auto font-mono border border-accent/5 max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default TransactionSimulator;
