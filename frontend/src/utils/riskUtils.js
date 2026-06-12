/**
 * Formats a numeric value as standard USD currency.
 * @param {number} amount 
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Formats a timestamp or ISO string into a human-readable date and time.
 * @param {string|number|Date} timestamp 
 * @returns {string}
 */
export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'N/A';
  
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

/**
 * Categorizes a risk score (0-100) into a textual level.
 * @param {number} score 
 * @returns {'LOW'|'MEDIUM'|'HIGH'}
 */
export const getRiskLevel = (score) => {
  if (score >= 70) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
};

/**
 * Maps a risk score (0-100) to appropriate Tailwind badge classes using locked design tokens.
 * @param {number} score 
 * @returns {string} - Tailwind style classes
 */
export const getRiskBadgeClass = (score) => {
  const level = getRiskLevel(score);
  switch (level) {
    case 'HIGH':
      return 'bg-danger-bg text-danger border border-danger/20';
    case 'MEDIUM':
      return 'bg-warning-bg text-warning border border-warning/20';
    case 'LOW':
    default:
      return 'bg-success-bg text-success border border-success/20';
  }
};

/**
 * Maps a ticket severity to appropriate Tailwind classes.
 * @param {string} severity 
 * @returns {string}
 */
export const getSeverityBadgeClass = (severity) => {
  const upperSeverity = (severity || '').toUpperCase();
  switch (upperSeverity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-danger-bg text-danger border border-danger/20 font-semibold';
    case 'MEDIUM':
      return 'bg-warning-bg text-warning border border-warning/20 font-semibold';
    case 'LOW':
      return 'bg-success-bg text-success border border-success/20 font-semibold';
    default:
      return 'bg-info-bg text-info border border-info/20 font-semibold';
  }
};

/**
 * Maps automated fraud decisions to appropriate Tailwind classes.
 * @param {string} decision 
 * @returns {string}
 */
export const getDecisionBadgeClass = (decision) => {
  const upperDecision = (decision || '').toUpperCase();
  switch (upperDecision) {
    case 'BLOCK':
    case 'BLOCKED':
    case 'DENY':
      return 'bg-danger text-surface font-semibold';
    case 'REVIEW':
    case 'FLAG':
    case 'FLAGGED':
      return 'bg-warning text-surface font-semibold';
    case 'APPROVE':
    case 'APPROVED':
    case 'ALLOW':
      return 'bg-success text-surface font-semibold';
    default:
      return 'bg-accent text-surface font-semibold';
  }
};

/**
 * Formats a number in Indian Rupees format.
 * @param {number} amount 
 * @returns {string}
 */
export const formatAmount = (amount) => {
  if (typeof amount !== 'number') return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, '');
};

/**
 * Maps a risk score to one of the 5 severity ranges.
 * @param {number} score 
 * @returns {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'NONE'}
 */
export const getSeverityLabel = (score) => {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  if (score >= 15) return 'LOW';
  return 'NONE';
};

/**
 * Maps risk score to decision labels.
 * @param {number} score 
 * @returns {'BLOCK'|'REVIEW'|'APPROVE'}
 */
export const getDecisionLabel = (score) => {
  if (score >= 70) return 'BLOCK';
  if (score >= 40) return 'REVIEW';
  return 'APPROVE';
};
