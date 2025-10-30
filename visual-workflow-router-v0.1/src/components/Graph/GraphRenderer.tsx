import React from 'react';
import { useEffect, useRef } from 'react';
import { WorkflowNode, WorkflowEdge } from '../../types';
import styles from './GraphStyles.module.css';

interface GraphRendererProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const GraphRenderer: React.FC<GraphRendererProps> = ({ nodes, edges }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw edges
    edges.forEach(edge => {
      const fromNode = nodes.find(node => node.id === edge.from_node_id);
      const toNode = nodes.find(node => node.id === edge.to_node_id);
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = edge.style === 'dashed' ? 'gray' : 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'lightblue';
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      ctx.fillStyle = 'black';
      ctx.fillText(node.title || '', node.x - 20, node.y - 25);
    });
  }, [nodes, edges]);

  return <canvas ref={canvasRef} className={styles.graphCanvas} width={800} height={600} />;
};

export default GraphRenderer;