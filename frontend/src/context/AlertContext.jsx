import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';
import { initSocket, disconnectSocket } from '../services/socket';
import { useToast } from '../components/ToastNotification';

export const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveTransactions, setLiveTransactions] = useState([]);
  const [liveRiskUpdates, setLiveRiskUpdates] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper to fetch the initial unresolved alert count
  const fetchUnresolvedCount = async () => {
    try {
      const response = await api.get('/api/alerts', { params: { resolved: false, limit: 1 } });
      setUnreadCount(response.data.pagination.total);
    } catch (err) {
      console.error('Failed to retrieve unresolved alerts count:', err.message);
    }
  };

  // Connect to Socket server when authenticated and manage event subscriptions
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const socketInstance = initSocket(token);
      socketInstance.connect();

      socketInstance.on('connect', () => {
        setSocketConnected(true);
      });

      socketInstance.on('disconnect', () => {
        setSocketConnected(false);
      });

      // Capture real-time fraud alerts
      socketInstance.on('newFraudAlert', (data) => {
        setAlerts((prev) => {
          // Prevent duplicate alert entries
          if (prev.some((a) => a._id === data.alert._id)) return prev;
          return [data.alert, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
        
        // Trigger visual toast
        showToast(
          'danger', 
          'New Fraud Alert', 
          `Critical ${data.alert.type.replace(/_/g, ' ')} detected on account ${data.alert.accountId?.accountNumber || 'ACC'}. Score: ${data.alert.riskScore}%`
        );
        
        // Broadcast custom browser notification event or play audio indicator
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.4;
          audio.play().catch(() => {}); // catch autoplay blocks
        } catch (_) {}
      });

      // Capture alert resolution synchronizations
      socketInstance.on('alertResolved', (data) => {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert._id === data.alertId
              ? {
                  ...alert,
                  resolved: true,
                  resolvedAt: data.timestamp,
                  resolvedBy: { _id: data.resolvedBy },
                }
              : alert
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Trigger success toast
        showToast('success', 'Alert Resolved', `Incident ticket ID ${data.alertId.substring(data.alertId.length - 6)} resolved successfully.`);
      });

      // Capture all transactions streamed from the ingest service
      socketInstance.on('transactionCreated', (data) => {
        setLiveTransactions((prev) => [data.transaction, ...prev].slice(0, 50));
        
        // Trigger toast alert if transaction was blocked
        if (data.transaction.status === 'blocked') {
          showToast(
            'danger', 
            'Transaction Blocked', 
            `Engine blocked suspicious transaction of ₹${data.transaction.amount} to merchant ${data.transaction.merchantName || 'unknown'}.`
          );
        }
      });

      // Capture account risk score adjustments
      socketInstance.on('riskScoreUpdated', (data) => {
        setLiveRiskUpdates((prev) => ({
          ...prev,
          [data.accountId]: {
            score: data.newScore,
            topK: data.topK,
            timestamp: Date.now(),
          },
        }));
      });

      // Fetch baseline alerts and counts on initial connect
      fetchUnresolvedCount();

      return () => {
        socketInstance.disconnect();
        disconnectSocket();
        setSocketConnected(false);
      };
    } else {
      // Clear live parameters on logout
      setAlerts([]);
      setLiveTransactions([]);
      setLiveRiskUpdates({});
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  const fetchAlerts = async (filters = {}) => {
    setLoading(true);
    try {
      const response = await api.get('/api/alerts', { params: filters });
      setAlerts(response.data.data);
      setPagination(response.data.pagination);
      
      // Update unresolved alert counts if querying general list
      if (filters.resolved === undefined || filters.resolved === 'false') {
        fetchUnresolvedCount();
      }
    } catch (err) {
      console.error('Failed to query alerts list:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const response = await api.patch(`/api/alerts/${alertId}/resolve`);
      const updatedAlert = response.data.data;
      
      // Sync local alerts list state
      setAlerts((prev) =>
        prev.map((alert) => (alert._id === alertId ? updatedAlert : alert))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      return updatedAlert;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resolve alert ticket.';
      throw new Error(msg);
    }
  };

  const assignAlert = async (alertId, investigatorId) => {
    try {
      const response = await api.patch(`/api/alerts/${alertId}/assign`, {
        assignedTo: investigatorId,
      });
      const updatedAlert = response.data.data;
      
      // Sync local alerts list state
      setAlerts((prev) =>
        prev.map((alert) => (alert._id === alertId ? updatedAlert : alert))
      );
      return updatedAlert;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign alert ticket.';
      throw new Error(msg);
    }
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const value = {
    alerts,
    pagination,
    unreadCount,
    liveTransactions,
    liveRiskUpdates,
    socketConnected,
    loading,
    fetchAlerts,
    resolveAlert,
    assignAlert,
    markAllAsRead,
  };

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};
