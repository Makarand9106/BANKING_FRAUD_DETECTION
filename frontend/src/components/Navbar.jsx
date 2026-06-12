import React, { useContext, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AlertContext } from '../context/AlertContext';
import { AuthContext } from '../context/AuthContext';
import { Bell, User, Clock, ShieldAlert, Check } from 'lucide-react';
import { formatDateTime } from '../utils/riskUtils';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { alerts, unreadCount, markAllAsRead } = useContext(AlertContext);
  const { user } = useContext(AuthContext);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute dynamic page title from location pathname
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/graph') return 'Network Graph View';
    if (path === '/transactions') return 'Transaction Ingestion Ledger';
    if (path === '/alerts') return 'Alert Incident Queue';
    if (path.startsWith('/alerts/')) return 'Alert Incident Details';
    if (path.startsWith('/accounts/')) return 'Account Ledger Profile';
    if (path === '/analytics') return 'Statistical Analytics';
    if (path === '/simulator') return 'Live Ingestion Simulator';
    if (path === '/settings') return 'Security & Operator Settings';
    return 'Sentinel Console';
  };

  const handleAlertClick = (alertId) => {
    setShowDropdown(false);
    navigate(`/alerts/${alertId}`);
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <header className="h-14 bg-surface border-b border-accent/5 flex items-center justify-between px-6 shrink-0 z-20 relative shadow-sm">
      {/* Left: Dynamic Route Page Title */}
      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
        {getPageTitle()}
      </h2>

      {/* Right: Notifications and Profile */}
      <div className="flex items-center space-x-4">
        {/* Alerts Bell Component */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleBellClick}
            className="p-1.5 hover:bg-bg rounded-lg text-muted hover:text-text-primary transition-all relative"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-surface text-[9px] font-black flex items-center justify-center rounded-full border border-surface">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Alert Bell Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-accent/10 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in text-xs">
              <div className="p-3 border-b border-accent/5 bg-bg/30 flex justify-between items-center font-bold">
                <span className="text-text-primary">Operational Notifications</span>
                <button 
                  onClick={() => { markAllAsRead(); setShowDropdown(false); }}
                  className="text-[10px] text-info hover:underline flex items-center space-x-0.5"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              </div>

              <div className="divide-y divide-accent/5 max-h-64 overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.slice(0, 5).map((item) => (
                    <div
                      key={item._id}
                      onClick={() => handleAlertClick(item._id)}
                      className="p-3 hover:bg-bg/40 cursor-pointer transition-colors space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-text-primary text-[10px] uppercase tracking-tight truncate max-w-[150px]">
                          {item.type.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                          item.severity === 'CRITICAL' || item.severity === 'HIGH'
                            ? 'bg-danger-bg text-danger'
                            : 'bg-warning-bg text-warning'
                        }`}>
                          {item.severity}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-muted truncate leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center space-x-1.5 text-[9px] text-muted">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted flex flex-col items-center justify-center space-y-1.5">
                    <ShieldAlert className="w-5 h-5 text-success opacity-55" />
                    <span>No unread alert signals in queue.</span>
                  </div>
                )}
              </div>

              <Link
                to="/alerts"
                onClick={() => setShowDropdown(false)}
                className="block p-2.5 text-center text-[10px] font-bold text-text-primary hover:bg-bg border-t border-accent/5 uppercase tracking-wider"
              >
                Open Alerts Queue
              </Link>
            </div>
          )}
        </div>

        {/* User Profile avatar + role chip */}
        <div className="flex items-center space-x-2 border-l border-accent/5 pl-4">
          <span className="text-[10px] font-mono bg-accent/5 border border-accent/10 px-2 py-0.5 rounded-lg text-text-primary font-bold uppercase tracking-wide">
            {user?.role || 'analyst'}
          </span>
          <div className="w-7 h-7 bg-accent text-surface text-[10px] font-black rounded-full flex items-center justify-center shadow-sm select-none border border-accent/10">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'OP'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
