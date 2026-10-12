import { create } from 'zustand';
import type { User, Vm } from '../api';

type DashboardState = {
  user: User | null;
  vms: Vm[];
  loading: boolean;
  socketConnected: boolean;
  highlightedVmIds: string[];
  setUser: (user: User | null) => void;
  setVms: (vms: Vm[] | ((current: Vm[]) => Vm[])) => void;
  setLoading: (loading: boolean) => void;
  setSocketConnected: (connected: boolean) => void;
  upsertVm: (vm: Vm, highlight?: boolean) => void;
  removeVm: (id: string) => void;
  clearSession: () => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  user: null,
  vms: [],
  loading: false,
  socketConnected: false,
  highlightedVmIds: [],
  setUser: (user) => set({ user }),
  setVms: (vms) => set((state) => ({ vms: typeof vms === 'function' ? vms(state.vms) : vms })),
  setLoading: (loading) => set({ loading }),
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  upsertVm: (vm, highlight = false) => set((state) => ({
    vms: state.vms.some((item) => item.id === vm.id)
      ? state.vms.map((item) => item.id === vm.id ? vm : item)
      : [vm, ...state.vms],
    highlightedVmIds: highlight
      ? [...state.highlightedVmIds.filter((id) => id !== vm.id), vm.id]
      : state.highlightedVmIds,
  })),
  removeVm: (id) => set((state) => ({
    vms: state.vms.filter((item) => item.id !== id),
    highlightedVmIds: state.highlightedVmIds.filter((item) => item !== id),
  })),
  clearSession: () => set({ user: null, vms: [], loading: false, socketConnected: false, highlightedVmIds: [] }),
}));
