import React from 'react';
import { render, screen } from '@testing-library/react';
import GraphRenderer from '../src/components/Graph/GraphRenderer';

describe('GraphRenderer', () => {
  const mockWorkflowData = {
    title: 'Test Workflow',
    description: 'A workflow for testing purposes',
    domain: 'Test Domain',
    version: 1,
    nodes: [
      { id: 'node_1', type: 'action', title: 'Start', x: 100, y: 100, details: {} },
      { id: 'node_2', type: 'action', title: 'Process', x: 200, y: 200, details: {} },
      { id: 'node_3', type: 'terminal', title: 'End', x: 300, y: 300, details: {} },
    ],
    edges: [
      { from_node_id: 'node_1', to_node_id: 'node_2', label: 'Next', style: 'solid' },
      { from_node_id: 'node_2', to_node_id: 'node_3', label: 'Finish', style: 'solid' },
    ],
  };

  test('renders the graph with nodes and edges', () => {
    render(<GraphRenderer workflowData={mockWorkflowData} />);
    
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  test('displays the correct number of nodes', () => {
    render(<GraphRenderer workflowData={mockWorkflowData} />);
    
    const nodes = screen.getAllByRole('node');
    expect(nodes).toHaveLength(mockWorkflowData.nodes.length);
  });

  test('displays the correct number of edges', () => {
    render(<GraphRenderer workflowData={mockWorkflowData} />);
    
    const edges = screen.getAllByRole('edge');
    expect(edges).toHaveLength(mockWorkflowData.edges.length);
  });
});