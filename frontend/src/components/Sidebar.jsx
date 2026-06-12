import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useFraudAlerts } from '../hooks/useFraudAlerts';
import { 
  LayoutDashboard, 
  Network, 
  ArrowLeftRight, 
  AlertTriangle, 
  BarChart2, 
  Zap, 
  Settings, 
  LogOut, 
  User, 
  Shield 
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount } = useFraudAlerts();
  const location = useLocation();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of the Sentinel Console?')) {
      await logout();
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Graph View', path: '/graph', icon: Network },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { 
      name: 'Alerts', 
      path: '/alerts', 
      icon: AlertTriangle, 
      badge: unreadCount > 0 ? unreadCount : null 
    },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Simulator', path: '/simulator', icon: Zap },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] bg-surface border-r border-accent/5 flex flex-col justify-between h-screen shrink-0 animate-fade-in">
      <div>
        {/* Brand Logo Header */}
        <div className="h-14 border-b border-accent/5 flex items-center px-5 space-x-2">
          <div className="w-7 h-7 bg-accent text-surface flex items-center justify-center rounded-lg shadow-sm">
            <Shield className="w-4 h-4 text-danger" />
          </div>
          <span className="font-extrabold text-xs tracking-wider uppercase text-text-primary">Sentinel Guard</span>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = 
              item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive 
                    ? 'bg-accent text-surface shadow-sm' 
                    : 'text-muted hover:text-text-primary hover:bg-bg'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <IconComponent className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                    isActive ? 'bg-danger text-surface' : 'bg-danger-bg text-danger border border-danger/10'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session Footer Block */}
      <div className="p-3 border-t border-accent/5 space-y-3 bg-bg/20">
        <div className="flex items-center space-x-2.5 px-1.5">
          <div className="w-8 h-8 bg-accent/5 text-text-primary border border-accent/10 rounded-full flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="text-[10px] min-w-0 flex-1">
            <span className="block font-bold text-text-primary truncate">{user?.email}</span>
            <span className="block text-muted font-mono uppercase text-[8px] tracking-wider font-semibold">{user?.role}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger-bg rounded-lg border border-danger/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
