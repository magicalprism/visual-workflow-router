import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Define types for the API responses
interface AnthropicMessage {
  role: string;
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: null | string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface WorkflowNode {
  id: string;
  type: 'action' | 'decision' | 'exception' | 'human' | 'terminal';
  title: string;
  x: number;
  y: number;
  details: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  label?: string;
  style?: 'solid' | 'dashed';
}

interface GeneratedWorkflow {
  title: string;
  description: string;
  domain: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { prompt: string };
    const prompt = body.prompt;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call Anthropic API
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `You are a workflow design expert. Based on the following description, create a workflow with nodes and edges.

Workflow description: ${prompt}

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Workflow Title",
  "description": "Brief description",
  "domain": "Domain name (e.g., HR, IT, Finance)",
  "nodes": [
    {
      "id": "node-1",
      "type": "action|decision|exception|human|terminal",
      "title": "Node title",
      "x": 100,
      "y": 100,
      "details": {}
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from_node_id": "node-1",
      "to_node_id": "node-2",
      "label": "optional label",
      "style": "solid|dashed"
    }
  ]
}

Node types:
- action: Automated task or operation
- decision: Decision point with multiple outcomes
- exception: Error handling or exception case
- human: Requires human intervention/approval
- terminal: End point of workflow

Create a logical flow with appropriate node types. Position nodes in a readable layout (space them 200-300px apart). Include at least one starting node and one terminal node. Make the workflow practical and complete.`,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', errorText);
      throw new Error('Failed to generate workflow with AI');
    }

    const aiResult = await anthropicResponse.json() as AnthropicResponse;
    
    // Parse the workflow data from Claude's response
    const workflowData: GeneratedWorkflow = JSON.parse(aiResult.content[0].text);

    // Create workflow in database
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow')
      .insert({
        title: workflowData.title,
        description: workflowData.description,
        domain: workflowData.domain || 'General',
        version: '1.0',
        status: 'draft',
      })
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Insert nodes
    if (workflowData.nodes && workflowData.nodes.length > 0) {
      const nodesData = workflowData.nodes.map((node) => ({
        workflow_id: workflow.id,
        id: node.id,
        type: node.type,
        title: node.title,
        x: node.x,
        y: node.y,
        details: node.details || {},
        status: 'active',
      }));

      const { error: nodesError } = await supabase
        .from('node')
        .insert(nodesData);

      if (nodesError) throw nodesError;
    }

    // Insert edges
    if (workflowData.edges && workflowData.edges.length > 0) {
      const edgesData = workflowData.edges.map((edge) => ({
        workflow_id: workflow.id,
        id: edge.id,
        from_node_id: edge.from_node_id,
        to_node_id: edge.to_node_id,
        label: edge.label || '',
        style: edge.style || 'solid',
      }));

      const { error: edgesError } = await supabase
        .from('edge')
        .insert(edgesData);

      if (edgesError) throw edgesError;
    }

    return NextResponse.json({
      workflowId: workflow.id,
      workflow: workflowData,
    });
  } catch (error: any) {
    console.error('Error generating workflow:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate workflow',
      },
      { status: 500 }
    );
  }
}