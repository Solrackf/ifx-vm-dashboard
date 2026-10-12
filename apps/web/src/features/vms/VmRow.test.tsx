import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Vm } from '../../api';
import VmRow from './VmRow';

const vm: Vm = {
  id: 'vm-test-1',
  name: 'Production API',
  cores: 4,
  ram: 16,
  disk: 120,
  os: 'Ubuntu 24.04 LTS',
  status: 'running',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderRow(canManage: boolean) {
  return render(
    <table>
      <tbody>
        <VmRow
          vm={vm}
          index={0}
          highlighted={false}
          canManage={canManage}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </tbody>
    </table>,
  );
}

describe('VmRow role actions', () => {
  it('does not render management actions for a read-only client', () => {
    renderRow(false);
    expect(
      screen.queryByRole('button', { name: /Acciones para Production API/ }),
    ).not.toBeInTheDocument();
  });

  it('renders edit and delete actions for an administrator', async () => {
    const user = userEvent.setup();
    renderRow(true);
    await user.click(screen.getByRole('button', { name: /Acciones para Production API/ }));

    expect(screen.getByRole('button', { name: 'Editar detalles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar máquina' })).toBeInTheDocument();
  });
});
