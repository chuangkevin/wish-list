const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (nickname: string) =>
    request<{ id: string; nickname: string; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),

  getMe: () => request<{ id: string; nickname: string }>('/auth/me'),

  listUsers: () => request<{ id: string; nickname: string }[]>('/auth/users'),

  loginAs: (id: string) =>
    request<{ id: string; nickname: string; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),

  // Issues
  listIssues: (status?: string) =>
    request<any[]>(`/issues${status ? `?status=${status}` : ''}`),

  getIssue: (id: string) => request<any>(`/issues/${id}`),

  createIssue: (data: { title: string; description?: string; priority?: string }) =>
    request<any>('/issues', { method: 'POST', body: JSON.stringify(data) }),

  updateIssue: (id: string, data: Record<string, string>) =>
    request<any>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Comments
  getComments: (issueId: string) => request<any[]>(`/issues/${issueId}/comments`),

  addComment: (issueId: string, content: string) =>
    request<any>(`/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Media
  uploadMedia: (issueId: string, files: File[], commentId?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (commentId) formData.append('commentId', commentId);
    return request<any[]>(`/issues/${issueId}/media`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteMedia: (issueId: string, mediaId: string) =>
    request<any>(`/issues/${issueId}/media/${mediaId}`, { method: 'DELETE' }),

  // Settings
  getApiKeys: () => request<{ keys: any[]; model: string }>('/settings/api-keys'),
  addApiKey: (apiKey: string) =>
    request<any>('/settings/api-keys', { method: 'POST', body: JSON.stringify({ apiKey }) }),
  batchImportKeys: (text: string) =>
    request<any>('/settings/api-keys/batch', { method: 'POST', body: JSON.stringify({ text }) }),
  deleteApiKey: (suffix: string) =>
    request<any>(`/settings/api-keys/${suffix}`, { method: 'DELETE' }),
  getTokenUsage: () => request<any>('/settings/token-usage'),
  updateModel: (model: string) =>
    request<any>('/settings/model', { method: 'PUT', body: JSON.stringify({ model }) }),

  // AI Chat
  getAiChat: (issueId: string) => request<any[]>(`/issues/${issueId}/ai-chat`),
  sendAiChat: (issueId: string, message: string) =>
    request<{ reply: string }>(`/issues/${issueId}/ai-chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  clearAiChat: (issueId: string) =>
    request<any>(`/issues/${issueId}/ai-chat`, { method: 'DELETE' }),
};
