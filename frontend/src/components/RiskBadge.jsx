import React from 'react';

/**
 * RiskBadge component renders pill badges with correct locked theme colors.
 * @param {{
 *   score?: number,
 *   severity?: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'NONE'|string,
 *   size?: 'sm'|'md'|'lg'
 * }} props 
 */
export const RiskBadge = ({ score, severity, size = 'md' }) => {
  // Determine severity classification from score or use severity directly
  let activeSeverity = 'NONE';

  if (typeof score === 'number') {
    if (score >= 85) activeSeverity = 'CRITICAL';
    else if (score >= 70) activeSeverity = 'HIGH';
    else if (score >= 35) activeSeverity = 'MEDIUM';
    else if (score >= 15) activeSeverity = 'LOW';
    else activeSeverity = 'NONE';
  } else if (severity) {
    activeSeverity = severity.toUpperCase();
  }

  // Define color mapping based on exact locked colors
  let colorClass = 'bg-accent/5 text-muted border border-accent/10';
  
  switch (activeSeverity) {
    case 'CRITICAL':
    case 'HIGH':
      colorClass = 'bg-danger-bg text-danger border border-danger/20';
      break;
    case 'MEDIUM':
    case 'LOW':
      colorClass = 'bg-warning-bg text-warning border border-warning/20';
      break;
    case 'NONE':
    default:
      colorClass = 'bg-success-bg text-success border border-success/20';
      break;
  }

  // Size mapping
  let sizeClass = 'text-[10px] px-2 py-0.5 font-bold';
  if (size === 'sm') {
    sizeClass = 'text-[9px] px-1.5 py-0.2 font-bold';
  } else if (size === 'lg') {
    sizeClass = 'text-xs px-3 py-1 font-extrabold';
  }

  return (
    <span className={`inline-block rounded-full uppercase tracking-wider text-center ${colorClass} ${sizeClass}`}>
      {activeSeverity} {typeof score === 'number' && `(${score})`}
    </span>
  );
};

export default RiskBadge;
