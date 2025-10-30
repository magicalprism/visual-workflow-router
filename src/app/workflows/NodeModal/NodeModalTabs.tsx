import React from 'react';
import { Tabs, TabPanel } from '../../../components/Tabs';
import GeneralTab from './Tabs/GeneralTab';
import RulesTab from './Tabs/RulesTab';
import RunbookTab from './Tabs/RunbookTab';
import AdvancedTab from './Tabs/AdvancedTab';

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
  ];

  return (
    <div>
      <Tabs tabs={tabs as any} className="mb-3" activeTab={activeTab} onTabChange={onTabChange} />

      <TabPanel value="general" activeTab={activeTab}>
        <GeneralTab {...( { nodeData, onChange } as any )} />
      </TabPanel>

      <TabPanel value="rules" activeTab={activeTab}>
        <RulesTab {...( { nodeData, onChange } as any )} />
      </TabPanel>

      <TabPanel value="runbook" activeTab={activeTab}>
        <RunbookTab {...( { nodeData, onChange } as any )} />
      </TabPanel>

      <TabPanel value="advanced" activeTab={activeTab}>
        <AdvancedTab {...( { nodeData, onChange } as any )} />
      </TabPanel>
    </div>
  );
};

export default NodeModalTabs;