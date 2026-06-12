import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, CheckCircle, UserPlus, ArrowRight, ExternalLink } from 'lucide-react';
import { getSeverityBadgeClass } from '../utils/riskUtils';

/**
 * Computes a time-ago description from a given timestamp.
 * @param {string|number|Date} timestamp 
 * @returns {string}
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export const AlertCard = ({ alert, onResolve, onAssign, compact = false }) => {
  const isResolved = alert.resolved;
  const severity = alert.severity || 'LOW';
  const type = alert.type || 'VELOCITY';

  // Severity borders
  let borderClass = 'border-l-4 border-l-muted';
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    borderClass = 'border-l-4 border-l-danger';
  } else if (severity === 'MEDIUM' || severity === 'LOW') {
    borderClass = 'border-l-4 border-l-warning';
  }

  // Handle compact layout (used on dashboard feeds)
  if (compact) {
    return (
      <div 
        className={`p-3 bg-surface border border-accent/5 rounded-lg flex items-start justify-between gap-3 text-xs shadow-sm transition-all hover:scale-[1.01] ${borderClass}`}
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${getSeverityBadgeClass(severity)}`}>
              {severity}
            </span>
            <span className="font-bold text-text-primary text-[10px] uppercase truncate">
              {type.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[9px] text-muted">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{formatTimeAgo(alert.createdAt)}</span>
            </span>
            {alert.accountId && (
              <span className="font-mono truncate">
                Acc: {(alert.accountId.accountNumber || alert.accountId).substring(0, 10)}
              </span>
            )}
          </div>
        </div>

        <Link 
          to={`/alerts/${alert._id}`}
          className="p-1 hover:bg-accent/5 rounded text-muted hover:text-text-primary self-center"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div 
      className={`bg-surface border border-accent/5 rounded-xl shadow-sm p-4.5 flex flex-col justify-between gap-4 text-xs transition-shadow hover:shadow-md animate-fade-in ${borderClass} ${
        isResolved ? 'opacity-60 grayscale-[10%]' : ''
      }`}
    >
      {/* Alert Header */}
      <div className="space-y-2">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center space-x-1.5">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getSeverityBadgeClass(severity)}`}>
              {severity}
            </span>
            <span className="font-extrabold text-text-primary text-xs uppercase tracking-tight">
              {type.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-1 text-[10px] text-muted font-semibold">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <span>{formatTimeAgo(alert.createdAt)}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-primary leading-relaxed text-xs">
          {alert.description}
        </p>
      </div>

      {/* Linked IDs Block */}
      <div className="grid grid-cols-2 gap-3 bg-bg/30 p-2.5 rounded-lg border border-accent/5">
        <div>
          <span className="block text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">Linked Account</span>
          {alert.accountId ? (
            <Link
              to={`/accounts/${alert.accountId._id || alert.accountId}`}
              className="font-mono font-bold text-text-primary hover:underline flex items-center gap-0.5"
            >
              <span>{alert.accountId.accountNumber || 'View Account'}</span>
              <ExternalLink className="w-3 h-3 text-muted" />
            </Link>
          ) : (
            <span className="text-muted">N/A</span>
          )}
        </div>

        <div>
          <span className="block text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">Linked Transaction</span>
          {alert.transactionId ? (
            <Link
              to={`/alerts/${alert._id}`}
              className="font-mono font-bold text-text-primary hover:underline flex items-center gap-0.5"
            >
              <span>#{String(alert.transactionId._id || alert.transactionId).substring(0, 8).toUpperCase()}</span>
              <ExternalLink className="w-3 h-3 text-muted" />
            </Link>
          ) : (
            <span className="text-muted">N/A</span>
          )}
        </div>
      </div>

      {/* Assignment Operator status */}
      <div className="flex items-center justify-between border-t border-accent/5 pt-3 text-[10px] text-muted">
        <div className="flex items-center space-x-1.5 min-w-0">
          <User className="w-3.5 h-3.5 text-muted" />
          <span className="truncate">
            {isResolved ? (
              <span>Resolved by: <span className="font-bold text-text-primary">{alert.resolvedBy?.email || 'System'}</span></span>
            ) : (
              <span>Assigned to: <span className="font-bold text-text-primary">{alert.assignedTo?.email || 'Unassigned'}</span></span>
            )}
          </span>
        </div>
      </div>

      {/* Card buttons controls */}
      {!isResolved && (
        <div className="flex items-center gap-2 pt-2 border-t border-accent/5">
          {!alert.assignedTo && onAssign && (
            <button
              onClick={() => onAssign(alert._id)}
              className="flex-1 py-1.5 bg-bg hover:bg-accent/5 text-text-primary border border-accent/10 font-bold rounded-lg flex items-center justify-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5 text-muted" />
              <span>Claim</span>
            </button>
          )}
          {onResolve && (
            <button
              onClick={() => onResolve(alert._id)}
              className="flex-1 py-1.5 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg flex items-center justify-center space-x-1 shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5 text-success" />
              <span>Resolve</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertCard;
