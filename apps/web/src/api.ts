export type Role = 'admin' | 'client';
export type VmStatus = 'running' | 'stopped' | 'paused';
export type User = { id: string; name: string; email: string; role: Role };
export type Vm = {
  id: string;
  name: string;
  cores: number;
  ram: number;
  disk: number;
  os: string;
  status: VmStatus;
  createdAt: string;
  updatedAt: string;
};
export type VmInput = Omit<Vm, 'id' | 'createdAt' | 'updatedAt'>;

const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'No pudimos completar la solicitud.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/api/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/me'),
  listVms: () => request<{ vms: Vm[] }>('/api/vms'),
  createVm: (vm: VmInput) =>
    request<{ vm: Vm }>('/api/vms', { method: 'POST', body: JSON.stringify(vm) }),
  updateVm: (id: string, vm: VmInput) =>
    request<{ vm: Vm }>(`/api/vms/${id}`, { method: 'PUT', body: JSON.stringify(vm) }),
  deleteVm: (id: string) => request<void>(`/api/vms/${id}`, { method: 'DELETE' }),
};
