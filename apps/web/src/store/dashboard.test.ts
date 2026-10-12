import { beforeEach, describe, expect, it } from 'vitest';
import type { Vm } from '../api';
import { useDashboardStore } from './dashboard';

const vm: Vm = {
  id: 'vm-test-1',
  name: 'Test VM',
  cores: 2,
  ram: 4,
  disk: 80,
  os: 'Ubuntu 24.04 LTS',
  status: 'running',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('dashboard store', () => {
  beforeEach(() => useDashboardStore.getState().clearSession());

  it('upserts an event once and records an update highlight', () => {
    const store = useDashboardStore.getState();
    store.upsertVm(vm);
    store.upsertVm({ ...vm, ram: 8 }, true);

    const state = useDashboardStore.getState();
    expect(state.vms).toHaveLength(1);
    expect(state.vms[0].ram).toBe(8);
    expect(state.highlightedVmIds).toEqual([vm.id]);
  });

  it('removes deleted VMs and their highlight state', () => {
    const store = useDashboardStore.getState();
    store.upsertVm(vm, true);
    store.removeVm(vm.id);

    expect(useDashboardStore.getState().vms).toEqual([]);
    expect(useDashboardStore.getState().highlightedVmIds).toEqual([]);
  });

  it('clears session-scoped state on sign out', () => {
    const store = useDashboardStore.getState();
    store.setUser({ id: 'user-1', name: 'Admin User', email: 'admin@ifx.test', role: 'admin' });
    store.upsertVm(vm, true);
    store.setSocketConnected(true);
    store.clearSession();

    expect(useDashboardStore.getState()).toMatchObject({
      user: null,
      vms: [],
      socketConnected: false,
      highlightedVmIds: [],
    });
  });
});
