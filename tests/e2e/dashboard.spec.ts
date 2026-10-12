import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signIn(
  page: import('@playwright/test').Page,
  email = 'admin@ifx.test',
  password = 'Admin123!',
) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /Acceder a la consola/ }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test('administrador crea, busca, edita y elimina una máquina', async ({ page }) => {
  const machineName = `QA E2E ${Date.now()}`;
  await signIn(page);
  await page.getByRole('button', { name: 'Nueva máquina' }).click();
  await expect(page).toHaveURL(/vms\/new/);
  await page.getByLabel('Nombre de la máquina').fill(machineName);
  await page.getByRole('button', { name: 'Crear máquina' }).click();
  await expect(page.getByRole('row', { name: new RegExp(machineName) })).toBeVisible();

  const statusFilter = page.getByRole('combobox', { name: 'Filtrar por estado' });
  await statusFilter.selectOption('stopped');
  await expect(page.getByRole('row', { name: /Legacy Archive/ })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(machineName) })).toHaveCount(0);
  await statusFilter.selectOption('all');

  const searchInput = page.getByPlaceholder('Buscar máquina...');
  await page.keyboard.press('Control+k');
  await expect(searchInput).toBeFocused();
  await searchInput.fill(machineName);
  const row = page.getByRole('row', { name: new RegExp(machineName) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: `Acciones para ${machineName}` }).click();
  await page.getByRole('button', { name: 'Editar detalles' }).click();
  await expect(page).toHaveURL(/vms\/[^/]+\/edit/);
  const updatedName = `${machineName} Updated`;
  await page.getByLabel('Nombre de la máquina').fill(updatedName);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('row', { name: new RegExp(updatedName) })).toBeVisible();

  const updatedRow = page.getByRole('row', { name: new RegExp(updatedName) });
  await updatedRow.getByRole('button', { name: `Acciones para ${updatedName}` }).click();
  await page.getByRole('button', { name: 'Eliminar máquina' }).click();
  await page.getByRole('button', { name: 'Eliminar máquina' }).last().click();
  await expect(page.getByRole('row', { name: new RegExp(updatedName) })).toHaveCount(0);
});

test('la reversión optimista retira la fila cuando falla la creación', async ({ page }) => {
  const machineName = `QA rollback ${Date.now()}`;
  let intercepted = false;
  await signIn(page);
  await page.route('**/api/vms', async (route) => {
    if (route.request().method() === 'POST') {
      intercepted = true;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"message":"Fallo controlado de prueba"}',
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Nueva máquina' }).click();
  await page.getByLabel('Nombre de la máquina').fill(machineName);
  await page.getByRole('button', { name: 'Crear máquina' }).click();
  await expect.poll(() => intercepted).toBe(true);
  await expect(page.getByText('No se pudo crear')).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(machineName) })).toHaveCount(0);
});

test('cliente queda en modo lectura y no accede a rutas administrativas', async ({ page }) => {
  await signIn(page, 'client@ifx.test', 'Client123!');
  await page.goto('/vms/new');
  await expect(page).toHaveURL(/vms$/);
  await expect(page.getByRole('button', { name: 'Nueva máquina' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Agregar máquina' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Acciones para/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Jordan Lee/ }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto('/vms');
  await expect(page).toHaveURL(/login/);
});

test('la vista de acceso y el dashboard no presentan hallazgos WCAG 2.1 A/AA de axe', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  const loginScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    loginScan.violations.map(({ id, impact, description }) => ({ id, impact, description })),
  ).toEqual([]);

  await signIn(page);
  await expect(page.getByRole('row', { name: /Production API/ })).toBeVisible();
  const dashboardScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    dashboardScan.violations.map(({ id, impact, description }) => ({ id, impact, description })),
  ).toEqual([]);

  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await expect
    .poll(() => page.locator('.app-shell').evaluate((element) => getComputedStyle(element).color))
    .toBe('rgb(37, 40, 35)');
  const lightThemeScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    lightThemeScan.violations.map(({ id, impact, description }) => ({ id, impact, description })),
  ).toEqual([]);
});
