'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIGenerateModal({ isOpen, onClose }: AIGenerateModalProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const generateWorkflow = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your workflow');
      return;
    }

    setIsGenerating(true);
    setError(null);
    controllerRef.current = new AbortController();

    try {
      console.debug('AIGenerate: sending request', { prompt });

      const response = await fetch('/api/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controllerRef.current.signal,
      });

      // Log status + headers
      console.groupCollapsed('AIGenerate: response metadata');
      console.log('status', response.status, response.statusText);
      const hdrs: Record<string, string> = {};
      response.headers.forEach((v, k) => (hdrs[k] = v));
      console.log('headers', hdrs);
      console.groupEnd();

      // Read full body text for reliable diagnostics
      const text = await response.text();
      console.debug('AIGenerate: raw response body', text);

      // Try to parse JSON if possible
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
        console.debug('AIGenerate: parsed JSON', parsed);
      } catch (parseErr) {
        console.warn('AIGenerate: response not JSON', parseErr);
      }

      if (!response.ok) {
        const serverMessage =
          parsed?.error || parsed?.message || text || response.statusText || `HTTP ${response.status}`;
        console.error('AIGenerate: server error', { status: response.status, body: text, parsed });
        throw new Error(serverMessage);
      }

      const result = (parsed ?? {}) as { workflowId?: number };

      if (result.workflowId) {
        router.push(`/workflows/${result.workflowId}`);
        onClose();
      } else {
        console.warn('AIGenerate: unexpected response', { parsed, text });
        setError('Workflow generated but response missing workflowId');
      }
    } catch (err) {
      if ((err as any).name === 'AbortError') setError('Generation cancelled');
      else setError((err as Error).message ?? 'Failed to generate workflow');
    } finally {
      controllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setPrompt('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Generate Workflow with AI</h2>
            <p className="text-gray-500 text-sm mt-1">
              Describe your workflow and AI will create it for you
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-sm font-medium mb-2">
            Describe your workflow
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Create an employee onboarding workflow that starts with HR approval, then sends welcome email, creates accounts, schedules training, and assigns mentor..."
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isGenerating}
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">💡 Tips for better results:</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Be specific about the steps and their order</li>
              <li>Mention decision points and conditions</li>
              <li>Include any human approval steps</li>
              <li>Specify exception handling if needed</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            onClick={() => {
              // If generating, abort the inflight request and close; otherwise normal close.
              if (isGenerating) {
                controllerRef.current?.abort();
                setIsGenerating(false);
                setError('Generation cancelled');
                onClose();
              } else {
                handleClose();
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={generateWorkflow}
            disabled={isGenerating || !prompt.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Workflow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}