import React from 'react';
import Modal from '../../../components/Modal';
import useAccessibleModal from '../../../hooks/useAccessibleModal';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const infoData = {
  nodeTypes: {
    action: 'An action node represents a task that needs to be performed.',
    decision: 'A decision node represents a branching point in the workflow.',
    human: 'A human node indicates a checkpoint that requires human intervention.',
    terminal: 'A terminal node signifies the end of the workflow.',
    exception: 'An exception node handles errors or unexpected events.',
  },
  phases: {
    planning: 'The planning phase involves outlining the workflow steps.',
    execution: 'The execution phase is where the workflow is carried out.',
    review: 'The review phase assesses the outcomes of the workflow.',
  },
};

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const { modalRef } = useAccessibleModal(isOpen, onClose);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help Tooltips">
      <div ref={modalRef} className="p-6">
        <h2 className="text-lg font-semibold mb-4">Help Tooltips</h2>
        <div className="space-y-4">
          <h3 className="text-md font-medium">Node Types</h3>
          <ul className="list-disc pl-5">
            {Object.entries(infoData.nodeTypes).map(([type, description]) => (
              <li key={type}>
                <strong>{type.charAt(0).toUpperCase() + type.slice(1)}:</strong> {description}
              </li>
            ))}
          </ul>
          <h3 className="text-md font-medium">Phases</h3>
          <ul className="list-disc pl-5">
            {Object.entries(infoData.phases).map(([phase, description]) => (
              <li key={phase}>
                <strong>{phase.charAt(0).toUpperCase() + phase.slice(1)}:</strong> {description}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default InfoModal;