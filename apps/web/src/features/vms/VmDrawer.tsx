import { useState, type FormEvent } from 'react';
import { Check, Plus, ShieldCheck, X } from 'lucide-react';
import type { Vm, VmInput, VmStatus } from '../../api';
import { validateVmField } from './validation';

const statusCopy: Record<VmStatus, string> = {
  running: 'En ejecución',
  stopped: 'Apagada',
  paused: 'Pausada',
};
const initialForm: VmInput = {
  name: '',
  cores: 4,
  ram: 16,
  disk: 240,
  os: 'Ubuntu 24.04 LTS',
  status: 'running',
};

export default function VmDrawer({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  initial: Vm | null;
  onClose: () => void;
  onSave: (vm: VmInput) => Promise<void>;
}) {
  const [form, setForm] = useState<VmInput>(
    initial
      ? {
          name: initial.name,
          cores: initial.cores,
          ram: initial.ram,
          disk: initial.disk,
          os: initial.os,
          status: initial.status,
        }
      : initialForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof VmInput, boolean>>>({});
  const [saving, setSaving] = useState(false);
  function update<K extends keyof VmInput>(key: K, value: VmInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (touched[key]) setErrors((current) => ({ ...current, [key]: validateVmField(key, value) }));
  }
  function blurField<K extends keyof VmInput>(key: K) {
    setTouched((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: validateVmField(key, form[key]) }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    (['name', 'cores', 'ram', 'disk', 'os'] as const).forEach((key) => {
      next[key] = validateVmField(key, form[key]);
    });
    Object.keys(next).forEach((key) => {
      if (!next[key]) delete next[key];
    });
    setTouched({ name: true, cores: true, ram: true, disk: true, os: true });
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim(), os: form.os.trim() });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <div className="panel-kicker">
              {mode === 'create' ? 'NUEVA INSTANCIA' : 'CONFIGURACIÓN'}
            </div>
            <h2>{mode === 'create' ? 'Añadir máquina' : 'Editar máquina'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </div>
        <div className="drawer-intro">
          {mode === 'create'
            ? 'Configura una instancia para tu infraestructura.'
            : 'Actualiza los recursos y detalles de esta instancia.'}
        </div>
        <form onSubmit={submit} className="vm-form">
          <label className="form-field full-field">
            <span>
              Nombre de la máquina <i>*</i>
            </span>
            <input
              autoFocus
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              onBlur={() => blurField('name')}
              aria-invalid={!!errors.name}
              placeholder="ej. Production API"
              maxLength={60}
            />
            <small className={errors.name ? 'field-error' : ''}>
              {errors.name || 'Usa un nombre claro y fácil de identificar.'}
            </small>
          </label>
          <div className="form-divider">
            <span>RECURSOS ASIGNADOS</span>
            <i />
          </div>
          <div className="form-row">
            <label className="form-field">
              <span>
                vCPU <i>*</i>
              </span>
              <div className="input-unit">
                <input
                  type="number"
                  min="1"
                  max="128"
                  value={form.cores}
                  onChange={(event) => update('cores', Number(event.target.value))}
                  onBlur={() => blurField('cores')}
                  aria-invalid={!!errors.cores}
                />
                <span>cores</span>
              </div>
              <small className={errors.cores ? 'field-error' : ''}>
                {errors.cores || '1 – 128 cores'}
              </small>
            </label>
            <label className="form-field">
              <span>
                Memoria RAM <i>*</i>
              </span>
              <div className="input-unit">
                <input
                  type="number"
                  min="1"
                  max="2048"
                  value={form.ram}
                  onChange={(event) => update('ram', Number(event.target.value))}
                  onBlur={() => blurField('ram')}
                  aria-invalid={!!errors.ram}
                />
                <span>GB</span>
              </div>
              <small className={errors.ram ? 'field-error' : ''}>
                {errors.ram || '1 – 2.048 GB'}
              </small>
            </label>
          </div>
          <label className="form-field full-field">
            <span>
              Almacenamiento <i>*</i>
            </span>
            <div className="input-unit">
              <input
                type="number"
                min="1"
                max="10000"
                value={form.disk}
                onChange={(event) => update('disk', Number(event.target.value))}
                onBlur={() => blurField('disk')}
                aria-invalid={!!errors.disk}
              />
              <span>GB</span>
            </div>
            <small className={errors.disk ? 'field-error' : ''}>
              {errors.disk || '1 – 10.000 GB'}
            </small>
          </label>
          <div className="form-divider">
            <span>SISTEMA Y ESTADO</span>
            <i />
          </div>
          <label className="form-field full-field">
            <span>
              Sistema operativo <i>*</i>
            </span>
            <select
              value={form.os}
              onChange={(event) => update('os', event.target.value)}
              onBlur={() => blurField('os')}
              aria-invalid={!!errors.os}
            >
              <option>Ubuntu 24.04 LTS</option>
              <option>Ubuntu 22.04 LTS</option>
              <option>Debian 12</option>
              <option>Rocky Linux 9</option>
              <option>Windows Server 2022</option>
              <option>Otro</option>
            </select>
          </label>
          <label className="form-field full-field">
            <span>Estado inicial</span>
            <div className="status-choice">
              {(['running', 'stopped', 'paused'] as VmStatus[]).map((status) => (
                <button
                  type="button"
                  key={status}
                  className={form.status === status ? `choice-active choice-${status}` : ''}
                  onClick={() => update('status', status)}
                >
                  <span className={`choice-dot dot-${status}`} />
                  {statusCopy[status]}
                </button>
              ))}
            </div>
          </label>
          <div className="drawer-note">
            <ShieldCheck size={16} />
            <span>Los cambios se sincronizan en tiempo real con tu equipo.</span>
          </div>
          <div className="drawer-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? (
                'Guardando…'
              ) : mode === 'create' ? (
                <>
                  <Plus size={16} />
                  Crear máquina
                </>
              ) : (
                <>
                  <Check size={16} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
