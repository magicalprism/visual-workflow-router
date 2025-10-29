'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Workflow } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    try {
      const { data, error } = await supabase
        .from('workflow')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredWorkflows = workflows.filter(w =>
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    w.domain?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading workflows...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Workflow Library</h1>
          
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              + New Workflow
            </button>
          </div>
        </div>

        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {search ? 'No workflows found matching your search' : 'No workflows yet'}
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Create Your First Workflow
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{workflow.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                    workflow.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {workflow.status}
                  </span>
                </div>
                
                {workflow.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {workflow.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {workflow.domain && (
                    <span className="px-2 py-1 bg-gray-100 rounded">{workflow.domain}</span>
                  )}
                  <span>v{workflow.version}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(workflow.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
