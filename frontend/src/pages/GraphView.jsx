import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import GraphCanvas from '../components/GraphCanvas';
import { formatCurrency, formatDateTime } from '../utils/riskUtils';
import RiskBadge from '../components/RiskBadge';
import { 
  Network, 
  RefreshCw, 
  HelpCircle, 
  Info, 
  Maximize2, 
  ArrowRight, 
  Layers 
} from 'lucide-react';

export const GraphView = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [suspiciousPaths, setSuspiciousPaths] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchSnapshot = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/graph/snapshot');
      const data = response.data.data;
      setNodes(data.nodes || []);
      setLinks(data.links || []);
      setSuspiciousPaths(data.suspiciousPaths || []);
      setLastRefreshed(new Date());

      // If we have a selected node, update its state from the new nodes dataset
      if (selectedNode) {
        const freshNode = data.nodes.find(n => n.id === selectedNode.id);
        if (freshNode) setSelectedNode(freshNode);
      }
    } catch (err) {
      console.error('Failed to query graph snapshot:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();

    // Setup auto-refresh every 30 seconds
    const interval = setInterval(fetchSnapshot, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen to live newFraudAlert socket events to trigger a snapshot refresh
  useEffect(() => {
    if (socket) {
      const handleNewAlert = () => {
        console.log('Socket triggered fraud alert: Refreshing graph snapshot...');
        fetchSnapshot();
      };
      
      socket.on('newFraudAlert', handleNewAlert);
      return () => {
        socket.off('newFraudAlert', handleNewAlert);
      };
    }
  }, [socket]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-accent/5 shrink-0 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center space-x-2">
            <Network className="w-6 h-6 text-accent" />
            <span>Fraud Relationship Graph</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Dynamic node-link visualizer mapping suspicious transfer flows, cyclic loops, and node risk levels.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold self-start sm:self-center">
          {lastRefreshed && (
            <span className="text-[10px] text-muted font-mono">
              Refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchSnapshot}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1.5 border border-accent/10 hover:bg-bg bg-surface rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Snap</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        
        {/* Left Column (80% width) - Visual Canvas */}
        <div className="lg:w-4/5 bg-surface border border-accent/5 rounded-2xl shadow-inner overflow-hidden relative h-full">
          {loading && nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface z-10 text-xs text-muted">
              <RefreshCw className="w-4 h-4 animate-spin text-accent" />
              <span>Calculating force layouts...</span>
            </div>
          ) : (
            <GraphCanvas
              nodes={nodes}
              links={links}
              suspiciousPaths={suspiciousPaths}
              onNodeClick={setSelectedNode}
            />
          )}
        </div>

        {/* Right Column (20% width) - Info & Legend Panel */}
        <div className="lg:w-1/5 bg-surface border border-accent/5 rounded-2xl p-4 shadow-sm flex flex-col justify-between overflow-y-auto h-full text-xs">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-accent/5 pb-2 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-info animate-pulse" />
              <span>Inspector Panel</span>
            </h3>

            {/* Selected Node details */}
            {selectedNode ? (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Account ID</span>
                  <span className="font-mono text-[10.5px] font-bold text-text-primary block break-all">
                    {selectedNode.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Account No</span>
                    <span className="font-bold text-text-primary block">{selectedNode.accountNumber}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Risk Rating</span>
                    <span className="block font-black text-text-primary">{selectedNode.riskScore}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Available Balance</span>
                  <span className="text-sm font-black text-text-primary">
                    {formatCurrency(selectedNode.balance)}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Severity State</span>
                  <RiskBadge severity={selectedNode.severity} size="sm" />
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Last Active</span>
                  <span className="text-text-primary text-[10px]">
                    {formatDateTime(selectedNode.lastActiveAt)}
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/accounts/${selectedNode.id}`)}
                  className="w-full py-2 mt-2 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-1"
                >
                  <span>View Account Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted leading-relaxed flex flex-col items-center justify-center space-y-2">
                <Maximize2 className="w-8 h-8 opacity-25" />
                <span>Select an account node in the force graph to inspect its parameters.</span>
              </div>
            )}
          </div>

          {/* Graph HUD Statistics & Legend */}
          <div className="space-y-3.5 border-t border-accent/5 pt-4 mt-4">
            {/* Stat Counters */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">Sub-graph Stats</h4>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="p-2 bg-bg rounded-lg border border-accent/5 text-center">
                  <span className="text-muted block text-[8px] uppercase">Nodes</span>
                  <span className="font-extrabold text-text-primary">{nodes.length}</span>
                </div>
                <div className="p-2 bg-bg rounded-lg border border-accent/5 text-center">
                  <span className="text-muted block text-[8px] uppercase">Edges</span>
                  <span className="font-extrabold text-text-primary">{links.length}</span>
                </div>
              </div>
              <div className="p-2.5 bg-bg rounded-lg border border-accent/5 flex justify-between items-center text-[10.5px]">
                <span className="text-muted text-[9px] uppercase font-bold flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-danger shrink-0" />
                  <span>Cycle Paths</span>
                </span>
                <span className="font-black text-danger">{suspiciousPaths.length}</span>
              </div>
            </div>

            {/* Color Legend */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">Severity Legend</h4>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger shrink-0" />
                  <span>Critical/High (&ge; 60%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shrink-0" />
                  <span>Medium (40-59%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#facc15] shrink-0" />
                  <span>Low (20-39%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                  <span>None (&lt; 20%)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default GraphView;
