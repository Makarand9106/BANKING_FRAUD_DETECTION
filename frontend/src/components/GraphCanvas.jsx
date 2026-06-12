import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

/**
 * Checks if a force-graph link is adjacent in any of the cycle suspicious paths.
 * Note: force-graph-2d mutates source/target into node objects at runtime.
 */
const isLinkOnSuspiciousPath = (link, suspiciousPaths = []) => {
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
  const targetId = typeof link.target === 'object' ? link.target.id : link.target;

  for (const pathObj of suspiciousPaths) {
    const p = pathObj.path || [];
    if (p.length < 2) continue;

    for (let i = 0; i < p.length; i++) {
      const u = p[i];
      const v = p[(i + 1) % p.length]; // cycle wrapping logic
      
      if ((u === sourceId && v === targetId) || (u === targetId && v === sourceId)) {
        return true;
      }
    }
  }
  return false;
};

export const GraphCanvas = ({ nodes, links, suspiciousPaths = [], onNodeClick }) => {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });

  // Handle dynamic resize measuring
  useEffect(() => {
    if (containerRef.current) {
      const handleResize = () => {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, containerRef.current.clientHeight || 550)
        });
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [nodes]);

  // Node coloring
  const getNodeColor = (score) => {
    if (score >= 60) return '#D93025'; // danger
    if (score >= 40) return '#f97316'; // orange
    if (score >= 20) return '#facc15'; // yellow
    return '#22c55e'; // green
  };

  return (
    <div ref={containerRef} className="w-full h-full relative min-h-[500px]">
      {nodes.length > 0 ? (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes, links }}
          backgroundColor="#FFFFFF"
          
          // Render nodes with custom text tags & pulsing outer ring for flagged accounts
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.accountNumber || node.id;
            const risk = node.riskScore || 0;
            // Node size: (riskScore / 100) * 18 + 6
            const size = (risk / 100) * 18 + 6;
            const radius = size / 2;
            const color = getNodeColor(risk);

            // Draw circular node body
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2 / globalScale;
            ctx.stroke();

            // Pulsing ring if flagged (risk >= 40 or custom status)
            const isFlagged = risk >= 40 || node.flagged || node.status === 'flagged' || node.status === 'blocked';
            if (isFlagged) {
              const t = (Date.now() / 250) % (2 * Math.PI);
              const ringRadius = radius + 3 + Math.sin(t) * 1.5;
              ctx.beginPath();
              ctx.arc(node.x, node.y, ringRadius, 0, 2 * Math.PI, false);
              ctx.strokeStyle = 'rgba(219, 38, 38, 0.45)';
              ctx.lineWidth = 1.5 / globalScale;
              ctx.stroke();
            }

            // Draw text tag below circle
            const fontSize = 8.5 / globalScale;
            ctx.font = `${fontSize}px monospace`;
            ctx.fillStyle = '#0F0F0F';
            ctx.textAlign = 'center';
            ctx.fillText(label, node.x, node.y + radius + fontSize + 1);
          }}

          // Links visual overrides
          linkWidth={link => isLinkOnSuspiciousPath(link, suspiciousPaths) ? 3 : (link.flagged ? 2 : 1)}
          linkColor={link => isLinkOnSuspiciousPath(link, suspiciousPaths) ? '#dc2626' : (link.flagged ? '#D93025' : '#d1d5db')}
          linkLineDash={link => isLinkOnSuspiciousPath(link, suspiciousPaths) ? [4, 3] : null}
          
          // Interactions
          onNodeClick={(node) => {
            if (onNodeClick) onNodeClick(node);
            if (fgRef.current) {
              fgRef.current.centerAt(node.x, node.y, 400);
              fgRef.current.zoom(2.5, 400);
            }
          }}
          onNodeHover={node => {
            document.body.style.cursor = node ? 'pointer' : 'default';
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted">
          Awaiting sub-graph snapshot variables...
        </div>
      )}
    </div>
  );
};

export default GraphCanvas;
