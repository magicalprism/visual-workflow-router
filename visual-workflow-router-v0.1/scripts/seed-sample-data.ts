import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedSampleData() {
  const workflows = [
    {
      title: 'Sample Workflow 1',
      description: 'This is a sample workflow for testing purposes.',
      domain: 'Testing',
      version: 1,
    },
    {
      title: 'Sample Workflow 2',
      description: 'Another sample workflow for demonstration.',
      domain: 'Demonstration',
      version: 1,
    },
  ];

  const { data: workflowData, error: workflowError } = await supabase
    .from('workflow')
    .insert(workflows)
    .select();

  if (workflowError) {
    console.error('Error inserting workflows:', workflowError);
    return;
  }

  const nodes = [
    { workflow_id: workflowData[0].id, title: 'Start', type: 'action', x: 100, y: 100 },
    { workflow_id: workflowData[0].id, title: 'Process', type: 'action', x: 200, y: 100 },
    { workflow_id: workflowData[0].id, title: 'End', type: 'terminal', x: 300, y: 100 },
  ];

  const { data: nodeData, error: nodeError } = await supabase
    .from('node')
    .insert(nodes)
    .select();

  if (nodeError) {
    console.error('Error inserting nodes:', nodeError);
    return;
  }

  const edges = [
    { workflow_id: workflowData[0].id, from_node_id: nodeData[0].id, to_node_id: nodeData[1].id, label: 'Next', style: 'solid' },
    { workflow_id: workflowData[0].id, from_node_id: nodeData[1].id, to_node_id: nodeData[2].id, label: 'Finish', style: 'solid' },
  ];

  const { error: edgeError } = await supabase
    .from('edge')
    .insert(edges);

  if (edgeError) {
    console.error('Error inserting edges:', edgeError);
    return;
  }

  console.log('Sample data seeded successfully!');
}

seedSampleData();