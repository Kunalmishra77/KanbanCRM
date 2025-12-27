// API client utilities
const API_BASE = '/api';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Important: include cookies for session auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: async (email: string) => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

// Clients API
export const clientsAPI = {
  getAll: () => fetchAPI('/clients'),
  getOne: (id: string) => fetchAPI(`/clients/${id}`),
  create: (data: any) => fetchAPI('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/clients/${id}`, {
    method: 'DELETE',
  }),
};

// Stories API
export const storiesAPI = {
  getAll: (clientId?: string) => {
    const query = clientId ? `?clientId=${clientId}` : '';
    return fetchAPI(`/stories${query}`);
  },
  getOne: (id: string) => fetchAPI(`/stories/${id}`),
  create: (data: any) => fetchAPI('/stories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/stories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/stories/${id}`, {
    method: 'DELETE',
  }),
};

// Comments API
export const commentsAPI = {
  getByStory: (storyId: string) => fetchAPI(`/stories/${storyId}/comments`),
  create: (storyId: string, data: any) => fetchAPI(`/stories/${storyId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Activity Log API
export const activityAPI = {
  getAll: (limit = 10) => fetchAPI(`/activity?limit=${limit}`),
};

// AI Proposal Analysis API
export const aiAPI = {
  analyzeProposal: (proposalText: string, clientName: string) => 
    fetchAPI('/analyze-proposal', {
      method: 'POST',
      body: JSON.stringify({ proposalText, clientName }),
    }),
  createTasksFromProposal: (clientId: string, tasks: any[]) =>
    fetchAPI(`/clients/${clientId}/create-tasks-from-proposal`, {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    }),
};

// Invoices API
export const invoicesAPI = {
  getByClient: (clientId: string) => fetchAPI(`/clients/${clientId}/invoices`),
  create: (clientId: string, data: any) => fetchAPI(`/clients/${clientId}/invoices`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/invoices/${id}`, {
    method: 'DELETE',
  }),
};

// Users API
export const usersAPI = {
  getAll: () => fetchAPI('/users'),
  update: (id: string, data: any) => fetchAPI(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

// Founder Investments API
export const founderInvestmentsAPI = {
  getAll: () => fetchAPI('/founder-investments'),
  create: (data: any) => fetchAPI('/founder-investments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/founder-investments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/founder-investments/${id}`, {
    method: 'DELETE',
  }),
};

// Sent Emails API
export const sentEmailsAPI = {
  getByStory: (storyId: string) => fetchAPI(`/stories/${storyId}/emails`),
  create: (storyId: string, data: any) => fetchAPI(`/stories/${storyId}/emails`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
