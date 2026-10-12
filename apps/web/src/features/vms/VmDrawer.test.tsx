import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import VmDrawer from './VmDrawer';

describe('VmDrawer', () => {
  it('validates on blur and revalidates while the user corrects a touched field', async () => {
    const user = userEvent.setup();
    render(<VmDrawer mode="create" initial={null} onClose={vi.fn()} onSave={vi.fn()} />);
    const name = screen.getByLabelText(/Nombre de la máquina/);

    await user.type(name, 'A');
    await user.tab();
    expect(await screen.findByText('Usa al menos 2 caracteres.')).toBeInTheDocument();

    await user.clear(name);
    await user.type(name, 'Production API');
    await waitFor(() => {
      expect(screen.queryByText('Usa al menos 2 caracteres.')).not.toBeInTheDocument();
    });
  });

  it('submits a valid VM using normalized text values', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<VmDrawer mode="create" initial={null} onClose={vi.fn()} onSave={onSave} />);

    await user.type(screen.getByLabelText(/Nombre de la máquina/), '  Production API  ');
    await user.click(screen.getByRole('button', { name: /Crear máquina/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Production API',
        os: 'Ubuntu 24.04 LTS',
        status: 'running',
      }),
    );
  });
});
