// API client utilities
const API_BASE = '/api';

// Store user ID for auth headers
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string | null) {
  currentUserId = userId;
  if (userId) {
    localStorage.setItem('agentix_user_id', userId);
  } else {
    localStorage.removeItem('agentix_user_id');
  }
}

export function getCurrentUserId(): string | null {
  if (!currentUserId) {
    currentUserId = localStorage.getItem('agentix_user_id');
  }
  return currentUserId;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const userId = getCurrentUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (userId) {
    headers['x-user-id'] = userId;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
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
