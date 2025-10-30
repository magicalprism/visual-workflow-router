import React from 'react';
import { useForm } from 'react-hook-form';

type RunbookTabProps = {
  nodeData?: any;
};

const RunbookTab: React.FC<RunbookTabProps> = ({ nodeData }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    console.log('Runbook saved', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="runbook_steps" className="text-sm block mb-1">Runbook Steps</label>
        <textarea id="runbook_steps" {...register('runbook_steps')} className="w-full border rounded px-2 py-1" />
        {errors.runbook_steps && <span className="text-red-600">{(errors.runbook_steps as any)?.message ?? String(errors.runbook_steps)}</span>}
      </div>

      <div>
        <label htmlFor="notes" className="text-sm block mb-1">Notes</label>
        <textarea id="notes" {...register('notes')} className="w-full border rounded px-2 py-1" />
        {errors.notes && <span className="text-red-600">{(errors.notes as any)?.message ?? String(errors.notes)}</span>}
      </div>

      <div>
        <label htmlFor="attachments" className="text-sm block mb-1">Attachments</label>
        <input id="attachments" type="text" {...register('attachments')} className="w-full border rounded px-2 py-1" />
        {errors.attachments && <span className="text-red-600">{(errors.attachments as any)?.message ?? String(errors.attachments)}</span>}
      </div>

      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Runbook</button>
    </form>
  );
};

export default RunbookTab;