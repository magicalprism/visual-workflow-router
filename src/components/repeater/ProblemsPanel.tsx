'use client';

import React from 'react';
import { ProblemsRepeaterMount } from '@/components/Repeater/configs/problemRepeater.config';

export type ProblemsPanelProps = {
  workflowId: number;
  className?: string;
};

export default function ProblemsPanel({ workflowId, className }: ProblemsPanelProps) {
  if (!workflowId) return null;
  return (
    <div className={className ?? ''}>
      <ProblemsRepeaterMount workflowId={workflowId} />
    </div>
  );
}