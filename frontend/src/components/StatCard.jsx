import React from 'react';

/**
 * StatCard component to render individual KPI metric cards.
 * @param {{
 *   title: string,
 *   value: string|number,
 *   change?: string|number,
 *   changeType?: 'positive'|'negative'|'neutral',
 *   icon: React.ComponentType<{ className?: string }>,
 *   color: 'danger'|'warning'|'success'|'info'|'muted'
 * }} props 
 */
export const StatCard = ({ title, value, change, changeType, icon: IconComponent, color }) => {
  // Map color modes to exact locked color tokens
  let circleBgClass = 'bg-accent/5';
  let iconColorClass = 'text-accent';

  switch (color) {
    case 'danger':
      circleBgClass = 'bg-danger-bg border border-danger/10';
      iconColorClass = 'text-danger';
      break;
    case 'warning':
      circleBgClass = 'bg-warning-bg border border-warning/10';
      iconColorClass = 'text-warning';
      break;
    case 'success':
      circleBgClass = 'bg-success-bg border border-success/10';
      iconColorClass = 'text-success';
      break;
    case 'info':
      circleBgClass = 'bg-info-bg border border-info/10';
      iconColorClass = 'text-info';
      break;
    case 'muted':
    default:
      circleBgClass = 'bg-accent/5 border border-accent/10';
      iconColorClass = 'text-muted';
      break;
  }

  return (
    <div className="bg-surface rounded-xl border border-accent/5 p-5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between animate-fade-in">
      <div className="space-y-2.5 min-w-0">
        <span className="text-xs font-bold text-muted uppercase tracking-wider block">
          {title}
        </span>
        <div className="text-2xl font-black text-text-primary truncate">
          {value}
        </div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-[11px] font-bold">
            {changeType === 'positive' && (
              <span className="text-success">&uarr; {change}</span>
            )}
            {changeType === 'negative' && (
              <span className="text-danger">&darr; {change}</span>
            )}
            {changeType === 'neutral' && (
              <span className="text-muted">{change}</span>
            )}
            <span className="text-muted font-normal text-[10px]">vs yesterday</span>
          </div>
        )}
      </div>

      <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${circleBgClass}`}>
        <IconComponent className={`w-5.5 h-5.5 ${iconColorClass}`} />
      </div>
    </div>
  );
};

export default StatCard;
