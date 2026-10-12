import { useState } from 'react';
import { MoreHorizontal, Server } from 'lucide-react';
import type { Vm, VmStatus } from '../../api';

const statusCopy: Record<VmStatus, string> = {
  running: 'En ejecución',
  stopped: 'Apagada',
  paused: 'Pausada',
};

export default function VmRow({
  vm,
  index,
  highlighted,
  canManage,
  onEdit,
  onDelete,
}: {
  vm: Vm;
  index: number;
  highlighted: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <tr
      className={`vm-row ${highlighted ? 'vm-row-highlight' : ''}`}
      style={{ animationDelay: `${Math.min(index * 45, 220)}ms` }}
    >
      <td>
        <div className="vm-name-cell">
          <div className={`vm-symbol vm-symbol-${vm.status}`}>
            <Server size={16} />
          </div>
          <div>
            <strong>{vm.name}</strong>
            <span>
              {vm.id.startsWith('optimistic') ? 'Guardando...' : vm.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </td>
      <td>
        <span className={`status-badge status-${vm.status}`}>
          <i />
          {statusCopy[vm.status]}
        </span>
      </td>
      <td>
        <span className="table-number">
          {vm.cores}
          <small> cores</small>
        </span>
      </td>
      <td>
        <span className="table-number">
          {vm.ram}
          <small> GB</small>
        </span>
      </td>
      <td>
        <span className="table-number">
          {vm.disk}
          <small> GB</small>
        </span>
      </td>
      <td>
        <span className="os-cell">
          <span className="os-orb">{vm.os.includes('Windows') ? '⊞' : '◉'}</span>
          {vm.os}
        </span>
      </td>
      <td className="action-cell">
        {canManage && (
          <div className="row-menu-wrap">
            <button
              className="row-menu-button"
              onClick={() => setMenu(!menu)}
              aria-label={`Acciones para ${vm.name}`}
            >
              <MoreHorizontal size={18} />
            </button>
            {menu && (
              <>
                <button
                  className="menu-scrim"
                  onClick={() => setMenu(false)}
                  aria-label="Cerrar menú"
                />
                <div className="row-menu">
                  <button
                    onClick={() => {
                      setMenu(false);
                      onEdit();
                    }}
                  >
                    Editar detalles
                  </button>
                  <button
                    className="menu-danger"
                    onClick={() => {
                      setMenu(false);
                      onDelete();
                    }}
                  >
                    Eliminar máquina
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
