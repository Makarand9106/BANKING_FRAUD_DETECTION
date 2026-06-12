import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/riskUtils';
import { 
  ArrowLeftRight, 
  ShieldAlert, 
  TrendingUp, 
  Activity, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldX
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

// Import UI components
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import TopKLeaderboard from '../components/TopKLeaderboard';

export const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    activeAlerts: 0,
    blockedTransactions: 0,
    avgRiskScore: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [suspiciousAccounts, setSuspiciousAccounts] = useState([]);
  const [liveAlertsFeed, setLiveAlertsFeed] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // 1. Fetch transactions ingested today
      const txTodayRes = await api.get('/api/transactions', {
        params: { startDate: todayISO, limit: 100 }
      });
      const txs = txTodayRes.data.data || [];
      const totalToday = txTodayRes.data.pagination?.total || txs.length;

      // 2. Fetch active unresolved alerts
      const activeAlertsRes = await api.get('/api/alerts', {
        params: { resolved: false, limit: 10 }
      });
      const activeCount = activeAlertsRes.data.pagination?.total || 0;
      setLiveAlertsFeed(activeAlertsRes.data.data?.slice(0, 5) || []);

      // 3. Fetch blocked transactions today
      const blockedRes = await api.get('/api/transactions', {
        params: { startDate: todayISO, status: 'blocked', limit: 1 }
      });
      const blockedCount = blockedRes.data.pagination?.total || 0;

      // 4. Calculate average risk score today
      let totalRisk = 0;
      let scoredCount = 0;
      txs.forEach(t => {
        const score = t.fraudScoreId?.totalScore || t.fraudScore?.totalScore;
        if (typeof score === 'number') {
          totalRisk += score;
          scoredCount++;
        }
      });
      const avgScore = scoredCount > 0 ? Math.round(totalRisk / scoredCount) : 0;

      setStats({
        totalTransactions: totalToday,
        activeAlerts: activeCount,
        blockedTransactions: blockedCount,
        avgRiskScore: avgScore
      });

      // Fetch recent 10 transactions
      const recentRes = await api.get('/api/transactions', { params: { limit: 10 } });
      setRecentTransactions(recentRes.data.data || []);

      // Fetch top suspicious accounts for TopK leaderboard
      const suspiciousRes = await api.get('/api/accounts/top-suspicious');
      const formattedTopK = (suspiciousRes.data.data || []).map(item => ({
        id: item.account._id,
        riskScore: item.account.riskScore,
        accountNumber: item.account.accountNumber
      }));
      setSuspiciousAccounts(formattedTopK);

      // Fetch alerts for patterns bar chart aggregation
      const alertsRes = await api.get('/api/alerts', { params: { limit: 100 } });
      setAllAlerts(alertsRes.data.data || []);

    } catch (err) {
      console.error('Failed to load dashboard dataset:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen to live socket notifications to update stats in real time
  useEffect(() => {
    if (socket) {
      // Capture live transaction ingestion events
      const handleTxCreated = (data) => {
        const tx = data.transaction;
        
        // 1. Prepend to recent transactions table feed
        setRecentTransactions(prev => [tx, ...prev].slice(0, 10));

        // 2. Adjust stats
        setStats(prev => {
          const newTotal = prev.totalTransactions + 1;
          const isBlocked = tx.status === 'blocked';
          const newBlocked = isBlocked ? prev.blockedTransactions + 1 : prev.blockedTransactions;

          // Estimate new average risk score
          const incomingScore = tx.fraudScoreId?.totalScore || 20; // fallback default
          const oldSum = prev.avgRiskScore * prev.totalTransactions;
          const newAvg = Math.round((oldSum + incomingScore) / newTotal);

          return {
            totalTransactions: newTotal,
            blockedTransactions: newBlocked,
            activeAlerts: prev.activeAlerts,
            avgRiskScore: newAvg
          };
        });
      };

      // Capture live alert events
      const handleNewAlert = (data) => {
        const alert = data.alert;

        // 1. Prepend to live alerts feed
        setLiveAlertsFeed(prev => [alert, ...prev].slice(0, 5));

        // 2. Increment unresolved count in stats
        setStats(prev => ({
          ...prev,
          activeAlerts: prev.activeAlerts + 1
        }));

        // 3. Append to chart alerts pool
        setAllAlerts(prev => [alert, ...prev]);
      };

      // Capture alert resolutions
      const handleAlertResolved = (data) => {
        setStats(prev => ({
          ...prev,
          activeAlerts: Math.max(0, prev.activeAlerts - 1)
        }));

        // Update list feed status
        setLiveAlertsFeed(prev => 
          prev.map(a => a._id === data.alertId ? { ...a, resolved: true } : a)
        );
      };

      socket.on('transactionCreated', handleTxCreated);
      socket.on('newFraudAlert', handleNewAlert);
      socket.on('alertResolved', handleAlertResolved);

      return () => {
        socket.off('transactionCreated', handleTxCreated);
        socket.off('newFraudAlert', handleNewAlert);
        socket.off('alertResolved', handleAlertResolved);
      };
    }
  }, [socket]);

  // Aggregate alert patterns for charts
  const getChartData = () => {
    const frequencies = {
      CYCLE: 0,
      VELOCITY: 0,
      SMURFING: 0,
      DRAIN: 0,
      DORMANT: 0
    };

    allAlerts.forEach(alert => {
      let typeName = (alert.type || '').toUpperCase();
      // Map loops/transfers to exact chart keys
      if (typeName === 'LOOP') typeName = 'CYCLE';
      else if (typeName === 'RAPID_TRANSFER') typeName = 'DRAIN';
      else if (typeName === 'ROUND_TRIP') typeName = 'DORMANT';

      if (frequencies[typeName] !== undefined) {
        frequencies[typeName]++;
      }
    });

    return Object.entries(frequencies).map(([name, value]) => ({
      name,
      value
    }));
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface border border-accent/5 h-24 rounded-xl shadow-sm" />
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 animate-pulse bg-surface border border-accent/5 h-96 rounded-xl shadow-sm" />
          <div className="space-y-6">
            <div className="animate-pulse bg-surface border border-accent/5 h-[300px] rounded-xl shadow-sm" />
            <div className="animate-pulse bg-surface border border-accent/5 h-[250px] rounded-xl shadow-sm" />
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="animate-pulse bg-surface border border-accent/5 h-72 rounded-xl shadow-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SECTION 1 - Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions (Today)"
          value={stats.totalTransactions}
          change={stats.totalTransactions > 10 ? '+8%' : 'New'}
          changeType="positive"
          icon={ArrowLeftRight}
          color="info"
        />
        <StatCard
          title="Active Fraud Alerts"
          value={stats.activeAlerts}
          change={stats.activeAlerts > 5 ? '+2' : 'Stable'}
          changeType={stats.activeAlerts > 5 ? 'negative' : 'neutral'}
          icon={ShieldAlert}
          color="danger"
        />
        <StatCard
          title="Blocked Transactions"
          value={stats.blockedTransactions}
          change={stats.blockedTransactions > 0 ? '+1' : '0'}
          changeType={stats.blockedTransactions > 0 ? 'negative' : 'neutral'}
          icon={ShieldX}
          color="warning"
        />
        <StatCard
          title="Average Risk Score"
          value={`${stats.avgRiskScore}%`}
          change="Updated live"
          changeType="neutral"
          icon={TrendingUp}
          color="muted"
        />
      </div>

      {/* SECTION 2 - Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Recent Transactions table */}
        <div className="lg:col-span-2 bg-surface border border-accent/5 rounded-xl shadow-sm p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-accent/5 pb-2">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-accent animate-pulse" />
                <span>Recent Transactions</span>
              </h3>
              <span className="text-[10px] text-muted font-bold lowercase tracking-wider">last 10 transactions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg/40 border-b border-accent/5 text-[9px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Account (Party)</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Risk Factor</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent/5">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => {
                      const fromNo = tx.fromAccount?.accountNumber || tx.fromAccountId?.accountNumber || 'EXT';
                      const toNo = tx.toAccount?.accountNumber || tx.toAccountId?.accountNumber || 'EXT';
                      const riskScoreVal = tx.fraudScoreId?.totalScore || tx.fraudScore?.totalScore || 0;

                      return (
                        <tr key={tx._id} className="hover:bg-bg/20 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[10.5px]">
                            {fromNo} &rarr; {toNo}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                              tx.status === 'completed' ? 'bg-success-bg text-success' :
                              tx.status === 'flagged' ? 'bg-warning-bg text-warning' :
                              'bg-danger-bg text-danger'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              riskScoreVal >= 70 ? 'bg-danger-bg text-danger' :
                              riskScoreVal >= 35 ? 'bg-warning-bg text-warning' :
                              'bg-success-bg text-success'
                            }`}>
                              {riskScoreVal}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted font-mono whitespace-nowrap">
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-muted">
                        No transactions found. Launch simulator to ingest sample records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Link
            to="/transactions"
            className="mt-4 block text-center text-[10px] font-bold text-text-primary hover:underline border-t border-accent/5 pt-3 uppercase tracking-wider flex items-center justify-center space-x-1"
          >
            <span>View All Ledger Logs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Right Column (1/3 width) - Leaderboard and Compact Alerts Feed */}
        <div className="space-y-6">
          {/* TopK leaderboard */}
          <TopKLeaderboard accounts={suspiciousAccounts} />

          {/* Live Alerts Feed */}
          <div className="bg-surface border border-accent/5 rounded-xl p-5 shadow-sm space-y-4 text-xs h-[300px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-accent/5 pb-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-danger animate-pulse" />
                  <span>Unresolved Alerts</span>
                </h3>
              </div>

              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {liveAlertsFeed.length > 0 ? (
                  liveAlertsFeed.map((alert) => {
                    let severityBorder = 'border-l-4 border-l-success';
                    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
                      severityBorder = 'border-l-4 border-l-danger';
                    } else if (alert.severity === 'MEDIUM' || alert.severity === 'LOW') {
                      severityBorder = 'border-l-4 border-l-warning';
                    }

                    return (
                      <Link
                        key={alert._id}
                        to={`/alerts/${alert._id}`}
                        className={`block p-2 bg-bg hover:bg-accent/[0.02] border border-accent/5 rounded-lg flex flex-col gap-1 transition-all ${severityBorder}`}
                      >
                        <div className="flex justify-between items-center font-bold text-[10px] text-text-primary uppercase">
                          <span>{alert.type.replace(/_/g, ' ')}</span>
                          <span className="text-[9px] font-mono font-normal lowercase text-muted">
                            {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted truncate">{alert.description}</p>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted flex flex-col items-center justify-center space-y-1.5">
                    <CheckCircle className="w-6 h-6 text-success opacity-55" />
                    <span>No unresolved security alerts.</span>
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/alerts"
              className="mt-4 block text-center text-[10px] font-bold text-text-primary hover:underline border-t border-accent/5 pt-3 uppercase tracking-wider flex items-center justify-center space-x-1"
            >
              <span>Inspect Alerts Queue</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

      {/* SECTION 3 - Fraud Pattern Bar Chart (full width) */}
      <div className="bg-surface border border-accent/5 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
          <Clock className="w-4 h-4 text-accent" />
          <span>Fraud Threat Vectors Classification</span>
        </h3>
        
        <div className="h-64 text-xs font-semibold">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0000000a" />
              <XAxis dataKey="name" stroke="#6B6B6B" fontSize={10} tickLine={false} />
              <YAxis stroke="#6B6B6B" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
              <Bar dataKey="value" fill="#D93025" radius={[4, 4, 0, 0]} name="Trigger Frequency" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
