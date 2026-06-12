import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../components/ToastNotification';
import AlertCard from '../components/AlertCard';
import { 
  Filter, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle, 
  X, 
  UserCheck, 
  AlertTriangle 
} from 'lucide-react';

export const Alerts = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    severity: '',
    type: '',
    resolved: 'false', // Default to unresolved (active) alerts
    assigned: 'all' // all | mine | unassigned
  });

  // Modals state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveTargetId, setResolveTargetId] = useState(null);
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [investigators, setInvestigators] = useState([]);

  // Fetch alerts matching filters
  const fetchAlertsList = async () => {
    setLoading(true);
    try {
      const activeFilters = { limit: 100 };
      
      if (filters.severity) activeFilters.severity = filters.severity;
      if (filters.type) activeFilters.type = filters.type;
      
      if (filters.resolved !== 'all') {
        activeFilters.resolved = filters.resolved;
      }
      
      if (filters.assigned === 'mine' && user) {
        activeFilters.assignedTo = user.id;
      } else if (filters.assigned === 'unassigned') {
        activeFilters.assignedTo = 'null';
      }

      const response = await api.get('/api/alerts', { params: activeFilters });
      let list = response.data.data || [];

      // Manual client-side keyword filtering for search description / account ID
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        list = list.filter(a => 
          (a.description || '').toLowerCase().includes(query) ||
          (a.accountId?.accountNumber || '').toLowerCase().includes(query) ||
          (a.accountId?._id || '').toLowerCase().includes(query)
        );
      }

      setAlerts(list);
    } catch (err) {
      console.error('Failed to query alerts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compile active analysts dynamically from previous assignments for selection dropdown
  const compileInvestigatorsList = async () => {
    try {
      // Seed list with currently logged user
      const list = [{ id: user.id, email: `${user.email} (You)` }];
      
      // Look up past historical alerts to extract operator names
      const res = await api.get('/api/alerts', { params: { limit: 100 } });
      const records = res.data.data || [];
      
      records.forEach(item => {
        if (item.assignedTo && item.assignedTo._id !== user.id) {
          if (!list.some(op => op.id === item.assignedTo._id)) {
            list.push({ id: item.assignedTo._id, email: item.assignedTo.email });
          }
        }
      });
      setInvestigators(list);
    } catch (err) {
      console.error('Failed to compile investigators lists:', err.message);
    }
  };

  // Force alert queries to run whenever filter states drop or mutate
  useEffect(() => {
    fetchAlertsList();
  }, [filters.search, filters.severity, filters.type, filters.resolved, filters.assigned]);

  useEffect(() => {
    if (showAssignModal) {
      compileInvestigatorsList();
    }
  }, [showAssignModal]);

  // Socket triggers
  useEffect(() => {
    if (socket) {
      // Capture live alert releases
      const handleNewAlert = (data) => {
        const alert = data.alert;
        
        // Show pulse indicator toast if CRITICAL
        if (alert.severity === 'CRITICAL') {
          showToast(
            'danger', 
            'CRITICAL Fraud Incident', 
            `Account ${alert.accountId?.accountNumber || 'ACC'} flagged for ${alert.type.replace(/_/g, ' ')}!`
          );
        }

        // Add to state if it fits current status filters
        setAlerts(prev => {
          // Prevent duplicates
          if (prev.some(a => a._id === alert._id)) return prev;
          
          const fitsStatus = 
            filters.resolved === 'all' || 
            (filters.resolved === 'false' && !alert.resolved) ||
            (filters.resolved === 'true' && alert.resolved);

          if (!fitsStatus) return prev;
          
          // Inject a temporary 'new' badge property for animation highlight
          const alertWithBadge = { ...alert, isNewTrigger: true };
          return [alertWithBadge, ...prev];
        });
      };

      // Capture live resolution completions
      const handleAlertResolved = (data) => {
        setAlerts(prev => 
          prev.map(a => 
            a._id === data.alertId 
              ? { 
                  ...a, 
                  resolved: true, 
                  resolvedAt: data.timestamp,
                  resolvedBy: { _id: data.resolvedBy, email: 'Operator' }
                } 
              : a
          )
        );
      };

      socket.on('newFraudAlert', handleNewAlert);
      socket.on('alertResolved', handleAlertResolved);

      return () => {
        socket.off('newFraudAlert', handleNewAlert);
        socket.off('alertResolved', handleAlertResolved);
      };
    }
  }, [socket, filters.resolved]);

  // Operations execution
  const handleResetFilters = () => {
    setFilters({
      search: '',
      severity: '',
      type: '',
      resolved: 'false',
      assigned: 'all'
    });
  };

  const handleResolveClick = (id) => {
    setResolveTargetId(id);
    setShowResolveModal(true);
  };

  const executeResolve = async () => {
    if (!resolveTargetId) return;
    try {
      await api.patch(`/api/alerts/${resolveTargetId}/resolve`);
      showToast('success', 'Incident Resolved', 'Incident ticket resolved successfully.');
      setAlerts(prev => 
        prev.map(a => a._id === resolveTargetId ? { ...a, resolved: true } : a)
      );
    } catch (err) {
      showToast('danger', 'Resolution Failed', err.response?.data?.message || 'Failed to update alert.');
    } finally {
      setShowResolveModal(false);
      setResolveTargetId(null);
    }
  };

  const handleAssignClick = (id) => {
    setAssignTargetId(id);
    setAssigneeId(user.id); // Default to current operator
    setShowAssignModal(true);
  };

  const executeAssign = async () => {
    if (!assignTargetId || !assigneeId) return;
    try {
      const res = await api.patch(`/api/alerts/${assignTargetId}/assign`, { assignedTo: assigneeId });
      showToast('success', 'Operator Assigned', 'Investigator assigned successfully.');
      setAlerts(prev => 
        prev.map(a => a._id === assignTargetId ? { ...a, assignedTo: res.data.data.assignedTo } : a)
      );
    } catch (err) {
      showToast('danger', 'Assignment Failed', err.response?.data?.message || 'Failed to assign ticket.');
    } finally {
      setShowAssignModal(false);
      setAssignTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-accent/5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Incident Command</h1>
          <p className="text-sm text-muted mt-1">
            Audit engine fraud triggers, assign cases to operators, and document risk resolutions.
          </p>
        </div>
        <button
          onClick={fetchAlertsList}
          className="mt-4 sm:mt-0 flex items-center justify-center space-x-1.5 px-3.5 py-1.5 border border-accent/10 hover:bg-bg rounded-lg text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Alerts</span>
        </button>
      </div>

      {/* Grid Filter Panel */}
      <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-4">
        <form onSubmit={(e) => { e.preventDefault(); fetchAlertsList(); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Search Target</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="ID, Description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-8 pr-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Alert Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Trigger Vector</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="">All Patterns</option>
                <option value="VELOCITY">Velocity</option>
                <option value="SMURFING">Smurfing</option>
                <option value="ROUND_TRIP">Round Trip</option>
                <option value="RAPID_TRANSFER">Rapid Transfer</option>
                <option value="LOOP">Graph Cycle</option>
              </select>
            </div>

            {/* Resolved status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Case Status</label>
              <select
                value={filters.resolved}
                onChange={(e) => setFilters(prev => ({ ...prev, resolved: e.target.value }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="false">Active Incidents</option>
                <option value="true">Resolved Incidents</option>
                <option value="all">All Cases</option>
              </select>
            </div>

            {/* Assigned to */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Investigator</label>
              <select
                value={filters.assigned}
                onChange={(e) => setFilters(prev => ({ ...prev, assigned: e.target.value }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="all">All Operators</option>
                <option value="mine">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-accent/5">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-accent text-surface hover:bg-accent/90 font-semibold rounded-lg shadow-sm flex items-center space-x-1.5"
            >
              <Filter className="w-3.5 h-3.5 text-surface" />
              <span>Filter Incidents</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active cases count banner */}
      <div className="text-xs text-muted">
        Showing <span className="font-bold text-text-primary">{alerts.length}</span> alert files
      </div>

      {/* Alerts Grid (2 cols on desktop, 1 on mobile) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="animate-pulse bg-surface border border-accent/5 h-44 rounded-xl shadow-sm" />
          ))}
        </div>
      ) : alerts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <div key={alert._id} className="relative">
              {/* Live "NEW" pulse indicator badge */}
              {alert.isNewTrigger && (
                <span className="absolute -top-1.5 -right-1.5 z-10 px-2 py-0.5 bg-danger text-surface text-[8px] font-black tracking-widest rounded-full shadow-md animate-pulse">
                  NEW
                </span>
              )}
              <AlertCard
                alert={alert}
                onResolve={handleResolveClick}
                onAssign={handleAssignClick}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-accent/5 p-16 text-center text-muted rounded-xl flex flex-col items-center justify-center space-y-3 shadow-sm">
          <CheckCircle className="w-12 h-12 text-success opacity-55" />
          <span className="text-sm">Nice! No alert tickets matched the current query variables.</span>
        </div>
      )}

      {/* CONFIRM RESOLUTION MODAL */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-accent/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-accent/10 w-full max-w-sm rounded-2xl shadow-2xl p-5 relative animate-fade-in space-y-4">
            <div className="flex items-center space-x-2 text-danger">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Confirm Case Resolution</h3>
            </div>
            
            <p className="text-xs text-muted leading-relaxed">
              Are you sure you want to mark this alert ticket as resolved? This will approve the associated transaction and document resolution compliance details.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="flex-1 py-2 bg-bg hover:bg-accent/5 border border-accent/10 rounded-lg font-bold text-text-primary text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeResolve}
                className="flex-1 py-2 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg shadow-sm text-xs"
              >
                Resolve Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN INVESTIGATOR MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-accent/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-accent/10 w-full max-w-sm rounded-2xl shadow-2xl p-5 relative animate-fade-in space-y-4">
            <div className="flex items-center space-x-2 text-text-primary">
              <UserCheck className="w-5 h-5 text-info" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Assign Investigator</h3>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Select Operator</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="" disabled>Choose operator...</option>
                {investigators.map(op => (
                  <option key={op.id} value={op.id}>{op.email}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2 bg-bg hover:bg-accent/5 border border-accent/10 rounded-lg font-bold text-text-primary text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAssign}
                disabled={!assigneeId}
                className="flex-1 py-2 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg shadow-sm text-xs disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Alerts;