import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, Cpu, HardDrive, LayoutDashboard, LogOut, Menu, Moon,
  MoreHorizontal, Plus, Search, Server, Settings2, ShieldCheck, Sun, Users, X, Zap,
} from 'lucide-react';
import { api, type User, type Vm, type VmInput, type VmStatus } from './api';
import { useDashboardStore } from './store/dashboard';
import MetricCard from './components/MetricCard';
import Login from './features/auth/Login';
import VmDrawer from './features/vms/VmDrawer';
import VmRow from './features/vms/VmRow';

type Toast = { id: number; title: string; message?: string; kind: 'success' | 'error' };
const statusCopy: Record<VmStatus, string> = { running: 'En ejecución', stopped: 'Apagada', paused: 'Pausada' };

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

function AppRoutes() {
  const user = useDashboardStore((state) => state.user);
  const setUser = useDashboardStore((state) => state.setUser);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    api.me().then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setAuthLoading(false));
  }, [setUser]);
  if (authLoading) return <div className="boot-screen"><div className="brand-mark large">I</div><div className="boot-line" /></div>;
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginRoute onLogin={setUser} />} />
    <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
    <Route path="/vms" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
    <Route path="/vms/new" element={<AdminRoute user={user}><Dashboard /></AdminRoute>} />
    <Route path="/vms/:id/edit" element={<AdminRoute user={user}><Dashboard /></AdminRoute>} />
    <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
  </Routes>;
}

function ProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  return user?.role === 'admin' ? <>{children}</> : user ? <Navigate to="/vms" replace /> : <Navigate to="/login" replace />;
}

function LoginRoute({ onLogin }: { onLogin: (user: User) => void }) {
  const navigate = useNavigate();
  async function signIn(email: string, password: string) {
    const result = await api.login(email, password);
    onLogin(result.user);
    navigate('/dashboard', { replace: true });
  }
  return <Login onLogin={signIn} />;
}

function Dashboard() {
  const user = useDashboardStore((state) => state.user)!;
  const vms = useDashboardStore((state) => state.vms);
  const setVms = useDashboardStore((state) => state.setVms);
  const loading = useDashboardStore((state) => state.loading);
  const setLoading = useDashboardStore((state) => state.setLoading);
  const socketConnected = useDashboardStore((state) => state.socketConnected);
  const setSocketConnected = useDashboardStore((state) => state.setSocketConnected);
  const upsertVm = useDashboardStore((state) => state.upsertVm);
  const removeVm = useDashboardStore((state) => state.removeVm);
  const clearSession = useDashboardStore((state) => state.clearSession);
  const highlightedVmIds = useDashboardStore((state) => state.highlightedVmIds);
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | VmStatus>('all');
  const [confirmVm, setConfirmVm] = useState<Vm | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const routeMatch = location.pathname.match(/^\/vms\/([^/]+)\/edit$/);
  const editing = routeMatch ? vms.find((vm) => vm.id === routeMatch[1]) ?? null : null;
  const drawer = location.pathname === '/vms/new' ? 'create' : routeMatch ? 'edit' : null;
  const activeNav = location.pathname.startsWith('/vms') ? 'vms' : 'overview';

  const toast = useCallback((title: string, kind: Toast['kind'] = 'success', message?: string) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, title, kind, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3600);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.listVms().then(({ vms: records }) => setVms(records)).catch((error) => toast('No pudimos cargar las máquinas', 'error', error.message)).finally(() => setLoading(false));
    const connection = io({ withCredentials: true });
    connection.on('connect', () => setSocketConnected(true));
    connection.on('disconnect', () => setSocketConnected(false));
    connection.on('vm:created', (vm: Vm) => upsertVm(vm));
    connection.on('vm:updated', (vm: Vm) => {
      upsertVm(vm, true);
      window.setTimeout(() => useDashboardStore.setState((state) => ({ highlightedVmIds: state.highlightedVmIds.filter((id) => id !== vm.id) })), 1800);
    });
    connection.on('vm:deleted', ({ id }: { id: string }) => removeVm(id));
    setSocket(connection);
    return () => { connection.disconnect(); setSocket(null); setSocketConnected(false); };
  }, [removeVm, setLoading, setSocketConnected, setVms, toast, upsertVm]);

  const activeVms = useMemo(() => vms.filter((vm) => vm.status === 'running'), [vms]);
  const availability = vms.length ? Math.round(activeVms.length / vms.length * 100) : 0;
  const totals = useMemo(() => activeVms.reduce((sum, vm) => ({ cores: sum.cores + vm.cores, ram: sum.ram + vm.ram, disk: sum.disk + vm.disk }), { cores: 0, ram: 0, disk: 0 }), [activeVms]);
  const filteredVms = useMemo(() => vms.filter((vm) => {
    const matchesQuery = `${vm.name} ${vm.os} ${vm.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === 'all' || vm.status === filter);
  }), [filter, query, vms]);
  const isAdmin = user.role === 'admin';

  async function signOut() {
    await api.logout().catch(() => undefined);
    socket?.disconnect();
    clearSession();
    navigate('/login', { replace: true });
  }

  async function saveVm(data: VmInput) {
    if (drawer === 'edit' && editing) {
      const previous = editing;
      const optimistic = { ...previous, ...data, updatedAt: new Date().toISOString() };
      setVms((items) => items.map((item) => item.id === previous.id ? optimistic : item));
      closeDrawer();
      try {
        const { vm } = await api.updateVm(previous.id, data);
        setVms((items) => items.map((item) => item.id === vm.id ? vm : item));
        toast('Cambios guardados', 'success', `${vm.name} está actualizado.`);
      } catch (error) {
        setVms((items) => items.map((item) => item.id === previous.id ? previous : item));
        toast('No se pudo actualizar', 'error', error instanceof Error ? error.message : undefined);
      }
      return;
    }
    const tempVm: Vm = { id: `optimistic-${Date.now()}`, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setVms((items) => [tempVm, ...items]);
    closeDrawer();
    try {
      const { vm } = await api.createVm(data);
      setVms((items) => items.some((item) => item.id === vm.id)
        ? items.filter((item) => item.id !== tempVm.id)
        : [vm, ...items.filter((item) => item.id !== tempVm.id)]);
      toast('Máquina creada', 'success', `${vm.name} ya está en tu infraestructura.`);
    } catch (error) {
      setVms((items) => items.filter((item) => item.id !== tempVm.id));
      toast('No se pudo crear', 'error', error instanceof Error ? error.message : undefined);
    }
  }

  async function deleteVm(vm: Vm) {
    setConfirmVm(null);
    setVms((items) => items.filter((item) => item.id !== vm.id));
    try {
      await api.deleteVm(vm.id);
      toast('Máquina eliminada', 'success', `${vm.name} fue retirada del inventario.`);
    } catch (error) {
      setVms((items) => items.some((item) => item.id === vm.id) ? items : [vm, ...items]);
      toast('No se pudo eliminar', 'error', error instanceof Error ? error.message : undefined);
    }
  }

  function openCreate() { navigate('/vms/new'); }
  function openEdit(vm: Vm) { navigate(`/vms/${vm.id}/edit`); }
  function closeDrawer() { navigate('/vms'); }

  return <div className={`app-shell ${dark ? 'theme-dark' : 'theme-light'}`}>
    {mobileMenu && <button className="mobile-backdrop" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">I</div><div className="brand-word">IFX<span> CLOUD</span></div><button className="mobile-close icon-button" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú"><X size={18} /></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">N</div><div className="workspace-copy"><strong>Northstar Group</strong><small>Enterprise workspace</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">PLATAFORMA</div>
      <nav className="main-nav">
        <button className={`nav-item ${activeNav === 'overview' ? 'selected' : ''}`} onClick={() => { navigate('/dashboard'); setMobileMenu(false); }}><LayoutDashboard size={18} /><span>Resumen</span></button>
        <button className={`nav-item ${activeNav === 'vms' ? 'selected' : ''}`} onClick={() => { navigate('/vms'); setMobileMenu(false); }}><Server size={18} /><span>Máquinas virtuales</span><span className="nav-count">{vms.length}</span></button>
        <button className="nav-item" onClick={() => toast('Próximamente', 'success', 'La vista de actividad estará disponible pronto.')}><Activity size={18} /><span>Actividad</span></button>
      </nav>
      <div className="nav-label second-label">GESTIÓN</div>
      <nav className="main-nav">
        <button className="nav-item" onClick={() => toast('Próximamente', 'success', 'La administración de miembros estará disponible pronto.')}><Users size={18} /><span>Miembros</span></button>
        <button className="nav-item" onClick={() => toast('Próximamente', 'success', 'La configuración del workspace estará disponible pronto.')}><Settings2 size={18} /><span>Configuración</span></button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="support-card"><div className="support-icon"><CircleHelp size={18} /></div><div><strong>¿Necesitas ayuda?</strong><span>Nuestro equipo está aquí.</span></div><ArrowRight size={15} /></div>
      <div className="sidebar-footer"><div className="security-seal"><ShieldCheck size={15} /><span>Infraestructura protegida</span></div><span className="sidebar-version">IFX Cloud Console <span>·</span> v1.0</span></div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menú"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav === 'vms' ? 'Máquinas virtuales' : 'Resumen'}</strong></div></div><div className="topbar-actions"><div className="live-indicator"><span className="live-dot" />{socketConnected ? 'En vivo' : 'Conectando'}</div><button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label="Cambiar tema">{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button notification-button" onClick={() => toast('Todo al día', 'success', 'No tienes notificaciones nuevas.')} aria-label="Notificaciones"><Bell size={18} /><i /></button><div className="topbar-divider" /><button className="profile-menu" onClick={signOut}><div className="profile-avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><span className="profile-name">{user.name}</span><ChevronDown size={14} /><span className="profile-logout"><LogOut size={15} /></span></button></div></header>

      <div className="content-wrap">
        <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-rule" />INFRAESTRUCTURA</div><h1>Tu infraestructura<span className="heading-period">.</span></h1><p>Una visión clara de tus recursos y máquinas virtuales.</p></div><div className="heading-right"><div className="last-sync"><span className="sync-pulse" />Sincronizado hace un momento</div>{isAdmin && <button className="primary-button" onClick={openCreate}><Plus size={17} strokeWidth={2.3} /><span>Nueva máquina</span></button>}</div></section>

        <section className="metric-grid">
          <MetricCard icon={<Server size={18} />} label="Máquinas virtuales" value={String(vms.length).padStart(2, '0')} detail={<><span className="metric-good"><ArrowUpRight size={14} />{activeVms.length} activas</span><span className="detail-sep">·</span><span>{vms.length - activeVms.length} detenidas</span></>} accent="gold" loading={loading} />
          <MetricCard icon={<Cpu size={18} />} label="vCPU asignadas" value={String(totals.cores).padStart(2, '0')} unit="cores" detail={<><span className="metric-caption">en máquinas activas</span></>} accent="blue" loading={loading} />
          <MetricCard icon={<Zap size={17} />} label="Memoria asignada" value={String(totals.ram)} unit="GB" detail={<><span className="metric-caption">de RAM en uso</span></>} accent="violet" loading={loading} />
          <MetricCard icon={<HardDrive size={18} />} label="Almacenamiento" value={String(totals.disk)} unit="GB" detail={<><span className="metric-caption">de disco asignado</span></>} accent="green" loading={loading} />
        </section>

        <section className="insights-grid">
          <div className="panel allocation-panel"><div className="panel-heading"><div><div className="panel-kicker">CAPACIDAD</div><h2>Recursos activos</h2></div><button className="subtle-action" onClick={() => navigate('/vms')}>Ver inventario <ArrowRight size={14} /></button></div><div className="resource-row"><div className="resource-title"><div className="resource-icon cpu-icon"><Cpu size={16} /></div><span>Procesamiento</span><strong>{totals.cores}<small> cores</small></strong></div><div className="resource-track"><span className="resource-fill fill-gold" style={{ width: `${Math.min(100, totals.cores / 64 * 100)}%` }} /></div><div className="resource-foot"><span>Capacidad asignada</span><span>de 64 cores</span></div></div><div className="resource-row"><div className="resource-title"><div className="resource-icon ram-icon"><Zap size={15} /></div><span>Memoria RAM</span><strong>{totals.ram}<small> GB</small></strong></div><div className="resource-track"><span className="resource-fill fill-blue" style={{ width: `${Math.min(100, totals.ram / 256 * 100)}%` }} /></div><div className="resource-foot"><span>Capacidad asignada</span><span>de 256 GB</span></div></div><div className="resource-row"><div className="resource-title"><div className="resource-icon disk-icon"><HardDrive size={15} /></div><span>Almacenamiento</span><strong>{totals.disk}<small> GB</small></strong></div><div className="resource-track"><span className="resource-fill fill-green" style={{ width: `${Math.min(100, totals.disk / 2000 * 100)}%` }} /></div><div className="resource-foot"><span>Capacidad asignada</span><span>de 2 TB</span></div></div></div>
          <div className="panel health-panel"><div className="panel-heading"><div><div className="panel-kicker">ESTADO DE LA INFRAESTRUCTURA</div><h2>Disponibilidad actual</h2></div><div className="health-icon"><Activity size={17} /></div></div><div className="health-summary"><div className="health-ring"><svg viewBox="0 0 120 120" aria-label={`Disponibilidad actual: ${availability}% de máquinas en ejecución`}><circle className="ring-track" cx="60" cy="60" r="48" /><circle className="ring-value" cx="60" cy="60" r="48" style={{ strokeDashoffset: 301.6 * (1 - availability / 100) }} /></svg><div className="ring-label"><strong>{availability}<span>%</span></strong><small>en ejecución</small></div></div><div className="health-copy"><div className="health-status"><span className="live-dot" />{activeVms.length === vms.length && vms.length > 0 ? 'Operativo' : activeVms.length ? 'Revisar estados' : 'Sin máquinas activas'}</div><p>{activeVms.length} de {vms.length} máquinas virtuales están en ejecución.</p><div className="health-sla"><span>Máquinas activas</span><strong>{activeVms.length} / {vms.length}</strong></div></div></div><div className="health-footer"><div className="health-foot-item"><Clock3 size={14} /><span>Estado actual</span></div><div className="health-foot-item"><span className="health-mini-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span>En tiempo real</span></div></div></div>
        </section>

        <section className="panel inventory-panel" id="vm-inventory"><div className="inventory-heading"><div><div className="panel-kicker">INVENTARIO</div><h2>Máquinas virtuales <span className="count-pill">{vms.length}</span></h2></div><div className="inventory-actions"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar máquina..." /><kbd>⌘ K</kbd></label><label className="filter-select"><span>{filter === 'all' ? 'Todos los estados' : statusCopy[filter]}</span><ChevronDown size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | VmStatus)} aria-label="Filtrar por estado"><option value="all">Todos los estados</option><option value="running">En ejecución</option><option value="stopped">Apagada</option><option value="paused">Pausada</option></select></label>{isAdmin && <button className="icon-button add-compact" onClick={openCreate} aria-label="Agregar máquina"><Plus size={18} /></button>}</div></div>
          <div className="vm-table-wrap"><table className="vm-table"><thead><tr><th>MÁQUINA</th><th>ESTADO</th><th>vCPU</th><th>MEMORIA</th><th>ALMACENAMIENTO</th><th>SISTEMA OPERATIVO</th><th /></tr></thead><tbody>
            {loading ? Array.from({ length: 4 }, (_, i) => <tr className="skeleton-row" key={i}><td colSpan={7}><div className="skeleton-bar" /></td></tr>) : filteredVms.map((vm, index) => <VmRow key={vm.id} vm={vm} index={index} highlighted={highlightedVmIds.includes(vm.id)} canManage={!!isAdmin} onEdit={() => openEdit(vm)} onDelete={() => setConfirmVm(vm)} />)}
          </tbody></table>{!loading && filteredVms.length === 0 && <div className="empty-state"><div className="empty-icon"><Server size={22} /></div><strong>{vms.length === 0 ? 'Aún no hay máquinas' : 'No encontramos resultados'}</strong><span>{vms.length === 0 ? 'Crea tu primera máquina virtual para empezar.' : 'Prueba con otro nombre o cambia el filtro.'}</span>{isAdmin && vms.length === 0 && <button className="primary-button compact" onClick={openCreate}><Plus size={16} />Crear máquina</button>}</div>}</div>
          <div className="table-footer"><span>Mostrando <strong>{filteredVms.length}</strong> de <strong>{vms.length}</strong> máquinas</span><div className="pagination"><button className="page-button" disabled><ChevronLeft size={16} /></button><button className="page-current">1</button><button className="page-button" disabled><ChevronRight size={16} /></button></div></div>
        </section>
        <footer className="content-footer"><span>© 2026 IFX Networks</span><span className="footer-links"><a href="#help" onClick={(event) => { event.preventDefault(); toast('Centro de ayuda', 'success', 'Contacta a tu administrador de infraestructura.'); }}>Centro de ayuda</a><span>·</span><a href="#status" onClick={(event) => { event.preventDefault(); toast('Estado del sistema', 'success', 'Todos los servicios operan normalmente.'); }}>Estado del sistema <ArrowUpRight size={12} /></a></span><span className="footer-version">Diseñado para operar con confianza <span className="footer-star">✳</span></span></footer>
      </div>
    </main>

    {drawer === 'create' && <VmDrawer mode="create" initial={null} onClose={closeDrawer} onSave={saveVm} />}
    {drawer === 'edit' && editing && <VmDrawer key={editing.id} mode="edit" initial={editing} onClose={closeDrawer} onSave={saveVm} />}
    {confirmVm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmVm(null); }}><div className="confirm-dialog"><button className="icon-button dialog-close" onClick={() => setConfirmVm(null)}><X size={18} /></button><div className="confirm-mark"><Server size={21} /></div><div className="panel-kicker">ELIMINAR MÁQUINA</div><h2>¿Retirar esta máquina?</h2><p><strong>{confirmVm.name}</strong> dejará de aparecer en el inventario. Esta acción no se puede deshacer.</p><div className="confirm-actions"><button className="secondary-button" onClick={() => setConfirmVm(null)}>Cancelar</button><button className="danger-button" onClick={() => deleteVm(confirmVm)}>Eliminar máquina</button></div></div></div>}
    <div className="toast-stack">{toasts.map((item) => <div className={`toast toast-${item.kind}`} key={item.id}><div className="toast-icon">{item.kind === 'success' ? <Check size={15} /> : <X size={15} />}</div><div><strong>{item.title}</strong>{item.message && <span>{item.message}</span>}</div><button onClick={() => setToasts((items) => items.filter((toastItem) => toastItem.id !== item.id))} aria-label="Cerrar aviso"><X size={15} /></button></div>)}</div>
  </div>;
}
