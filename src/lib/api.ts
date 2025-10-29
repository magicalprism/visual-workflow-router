const API_BASE = process.env.NEXT_PUBLIC_CF_WORKER_URL || '';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }

  return response.json();
}

export const api = {
  workflows: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiCall(`/workflows${query}`);
    },
    get: (id: number) => apiCall(`/workflows/${id}`),
    create: (data: any) => apiCall('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: any) => apiCall(`/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    generateFromPrompt: (prompt: string, domain?: string) => apiCall('/ai/workflow/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, domain }),
    }),
    exportReport: (workflowId: number, format: 'docx' | 'pdf', options: any) => 
      apiCall('/ai/workflow/report', {
        method: 'POST',
        body: JSON.stringify({ workflow_id: workflowId, format, options }),
      }),
  },
  runs: {
    create: (workflowId: number, input: any) => apiCall('/runs', {
      method: 'POST',
      body: JSON.stringify({ workflow_id: workflowId, input }),
    }),
    get: (id: number) => apiCall(`/runs/${id}`),
  },
};
