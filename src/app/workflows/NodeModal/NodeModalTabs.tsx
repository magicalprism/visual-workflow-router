import React from 'react';
import { Tabs, TabPanel } from '../../../components/Tabs';
import GeneralTab from './Tabs/GeneralTab';
import RulesTab from './Tabs/RulesTab';
import RunbookTab from './Tabs/RunbookTab';
import AdvancedTab from './Tabs/AdvancedTab';
import ProblemsPanel from '../../../components/repeater/ProblemsPanel'; // optional if you want a Problems tab

interface NodeModalTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  nodeData?: any;
  onChange?: (patch: Partial<any>) => void;
}

const NodeModalTabs: React.FC<NodeModalTabsProps> = ({ activeTab, onTabChange, nodeData, onChange }) => {
  const tabs = [
    { id: 'general', label: 'Overview' },
    { id: 'rules', label: 'Logic' },
    { id: 'runbook', label: 'Runbook' },
    { id: 'advanced', label: 'Advanced' },
    // { id: 'problems', label: 'Problems' }, // enable if you want a Problems tab in the modal
  ];

  // Support both DB node shape and ReactFlow node wrapper:
  // - DB node: { id: 16, workflow_id: 3, ... }
  // - RF node: { id: '16', data: { nodeData: { id: 16, workflow_id: 3, ... } } }
  const underlying = nodeData?.data?.nodeData ?? nodeData ?? {};
  const rawWorkflowId = underlying?.workflow_id ?? underlying?.workflowId ?? underlying?.workflow;
  // RF top-level id may be the node id (string),
  const rawNodeId = underlying?.id ?? underlying?.nodeId ?? nodeData?.id ?? undefined;

  const workflowId = rawWorkflowId != null ? Number(rawWorkflowId) : undefined;
  const nodeId = rawNodeId != null ? Number(rawNodeId) : undefined;

  console.log('NodeModalTabs -> normalized ids', { rawWorkflowId, rawNodeId, workflowId, nodeId });

  return (
    <div>
      <Tabs tabs={tabs as any} className="mb-3" activeTab={activeTab} onTabChange={onTabChange} />

      <TabPanel value="general" activeTab={activeTab}>
        <GeneralTab {...({ nodeData, onChange } as any)} />
      </TabPanel>

      <TabPanel value="rules" activeTab={activeTab}>
        <RulesTab workflowId={workflowId} nodeId={nodeId} />
      </TabPanel>

      <TabPanel value="runbook" activeTab={activeTab}>
        <RunbookTab {...({ nodeData, onChange } as any)} />
      </TabPanel>

      <TabPanel value="advanced" activeTab={activeTab}>
        <AdvancedTab {...({ nodeData, onChange } as any)} />
      </TabPanel>

      {/* Optional Problems tab inside modal:
      <TabPanel value="problems" activeTab={activeTab}>
        {workflowId ? <ProblemsPanel workflowId={workflowId} /> : <div>Select a workflow</div>}
      </TabPanel>
      */}
    </div>
  );
};

export default NodeModalTabs;