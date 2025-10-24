// e2e/auth-career.spec.js
import { test, expect } from '@playwright/test';

test('Login and view career details', async ({ page }) => {
  // 1. Ir a la página de login
  await page.goto('/frontend/login.html'); // Asume baseURL está configurada

  // 2. Rellenar credenciales (Usa variables de entorno o credenciales de test)
  await page.locator('#username').fill('usuario_prueba@example.com'); // Usa ID del input
  await page.locator('#password').fill('contraseña_prueba'); // Usa ID del input

  // 4. Click en login
  await page.locator('button[type="submit"]').click(); // Selector del botón

  // 5. Esperar redirección y verificar URL
  await page.waitForURL('**/dePrueba.html'); // Espera a que la URL contenga dePrueba.html
  await expect(page).toHaveURL(/.*dePrueba\.html/);

  // 7. Verificar mensaje de bienvenida
  // Asumiendo que el RUT de prueba es '11.111.111-1'
  const saludoLocator = page.locator('#saludo-usuario h1'); // Selector del h1 dentro del div
  await expect(saludoLocator).toBeVisible();
  await expect(saludoLocator).toContainText('Bienvenido, 11.111.111-1!'); // Verifica el texto esperado

  // 8. Click en enlace a carreras
  await page.locator('a[href="/frontend/carreras/carrerasUsuario.html"]').click(); // Selector del enlace

  // 9. Verificar URL de carreras
  await page.waitForURL('**/carrerasUsuario.html');
  await expect(page).toHaveURL(/.*carrerasUsuario\.html/);

  // 10. Verificar que se muestran datos o el indicador de carga
  const datosCarreraLocator = page.locator('#datos-carrera'); // ID del contenedor
  // Espera a que el contenedor tenga algún contenido (spinner o datos)
  await expect(datosCarreraLocator).not.toBeEmpty();
  // Podrías verificar específicamente el spinner o un dato esperado si sabes cuál es
  // await expect(page.locator('#datos-carrera .animate-spin')).toBeVisible(); // Verifica el spinner
});