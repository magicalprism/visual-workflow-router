'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteWorkflowButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // prevent the Link (parent) from navigating when clicking this button
    e?.stopPropagation();
    e?.preventDefault();
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflow/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload: any = await res.json().catch(() => ({}));
        alert('Failed to delete workflow: ' + (payload?.error ?? res.statusText));
        setLoading(false);
        return;
      }
      // Redirect to workflows list after delete
      router.push('/workflows');
    } catch (err) {
      console.error('Delete request failed', err);
      alert('Delete failed');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => handleDelete(e)}
      disabled={loading}
      aria-label="Delete workflow"
      title="Delete workflow"
      // gray, subtle icon button
      className="p-1 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
    >
      {/* Crisp filled trash icon provided by user */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Zm48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Z" />
      </svg>
    </button>
  );
}