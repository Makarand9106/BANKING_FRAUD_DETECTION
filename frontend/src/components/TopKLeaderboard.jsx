import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import RiskBadge from './RiskBadge';

/**
 * TopKLeaderboard renders a real-time leaderboard of the top 10 most suspicious accounts.
 * @param {{ accounts: Array<{ id: string, riskScore: number, accountNumber?: string }> }} props 
 */
export const TopKLeaderboard = ({ accounts: initialAccounts }) => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [accounts, setAccounts] = useState(initialAccounts || []);

  useEffect(() => {
    if (initialAccounts) {
      setAccounts(initialAccounts);
    }
  }, [initialAccounts]);

  useEffect(() => {
    if (socket) {
      const handleRiskUpdate = (data) => {
        // data: { accountId, newScore, topK }
        if (data.topK && Array.isArray(data.topK)) {
          // If the socket provides the computed topK heap array directly, swap it
          const formattedTopK = data.topK.map(item => ({
            id: item._id || item.id, // accommodate object model references
            riskScore: item.riskScore,
            accountNumber: item.accountNumber || item.id
          }));
          setAccounts(formattedTopK);
        } else {
          // Otherwise, manually update score of matching account node in list and re-sort
          setAccounts(prev => {
            const index = prev.findIndex(a => a.id === data.accountId);
            let updated = [...prev];
            if (index !== -1) {
              updated[index] = { ...updated[index], riskScore: data.newScore };
            } else if (updated.length < 10) {
              updated.push({ id: data.accountId, riskScore: data.newScore });
            }
            return updated
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 10);
          });
        }
      };

      socket.on('riskScoreUpdated', handleRiskUpdate);
      return () => {
        socket.off('riskScoreUpdated', handleRiskUpdate);
      };
    }
  }, [socket]);

  return (
    <div className="bg-surface border border-accent/5 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in text-xs">
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2">
        Top Suspicious Accounts
      </h3>

      <div className="space-y-3">
        {accounts.length > 0 ? (
          accounts.slice(0, 10).map((item, index) => {
            const rank = index + 1;
            const accountId = item.id;
            const displayId = item.accountNumber || accountId;
            const risk = item.riskScore;

            return (
              <div 
                key={accountId} 
                className="flex items-center justify-between gap-4 py-1.5 border-b border-accent/[0.02]"
              >
                {/* Rank and Account Number */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="font-mono text-muted font-bold w-4 text-center">
                    {rank}
                  </span>
                  <Link
                    to={`/accounts/${accountId}`}
                    className="font-mono font-bold text-text-primary hover:underline truncate hover:text-accent"
                    title="Audit profile"
                  >
                    {displayId}
                  </Link>
                </div>

                {/* Score slider bar */}
                <div className="flex-1 hidden sm:block">
                  <div className="w-full bg-accent/5 h-2 rounded-full overflow-hidden border border-accent/5">
                    <div
                      className="bg-danger h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, risk))}%` }}
                    />
                  </div>
                </div>

                {/* RiskBadge */}
                <div className="shrink-0">
                  <RiskBadge score={risk} size="sm" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted">
            Awaiting risk score updates...
          </div>
        )}
      </div>
    </div>
  );
};

export default TopKLeaderboard;
