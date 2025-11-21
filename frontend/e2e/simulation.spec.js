// Archivo: frontend/e2e/simulation.spec.js
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5500';

test.describe('Simulación y Persistencia', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto(`${BASE_URL}/login.html`);
    await page.fill('#username', 'maria@example.com');
    await page.fill('#password', 'pass_maria');

    // Manejar alerta de login
    page.once('dialog', async dialog => {
      console.log(`[beforeEach] Aceptando alerta: ${dialog.message()}`);
      await dialog.accept();
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dePrueba.html');
    
    // 2. Esperar a que el Dashboard cargue datos
    // Esto es clave: dashboard.js tarda unos milisegundos en renderizar los botones
    await expect(page.getByRole('heading', { name: 'Bienvenido', exact: true })).toBeVisible();

    // 3. Navegar a Carreras (Usando selector por Rol, más robusto que el href)
    await page.getByRole('link', { name: 'Consultar Carreras' }).click();
    
    // 4. Seleccionar Carrera
    // Esperamos a que aparezca el enlace de la carrera específica
    await page.getByRole('link', { name: 'Ingeniería Civil Industrial' }).click();
    
    // 5. Verificar llegada a la malla
    await page.waitForURL('**/malla/mallaCarrera.html**');
  });

  test('Debe generar proyección, guardar escenario y recuperarlo', async ({ page }) => {
    // 1. Verificar carga inicial
    const projContainer = page.locator('#proyeccion-container');
    await expect(projContainer).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.malla-nivel[data-sem-index="0"]')).toBeVisible(); 

    // 2. GUARDAR Escenario
    page.once('dialog', async dialog => {
        console.log(`[Dialog Guardar] Mensaje: ${dialog.message()}`);
        await dialog.accept('Plan E2E Automático');
    });

    await page.click('button:has-text("Guardar Escenario")');
    
    console.log('Esperando confirmación de guardado...');
    const alertaExito = await page.waitForEvent('dialog');
    console.log(`[Dialog Éxito] Mensaje: ${alertaExito.message()}`);
    await alertaExito.accept();
    
    // 3. Recargar para limpiar memoria
    await page.reload();
    await page.waitForURL('**/malla/mallaCarrera.html**');
    await expect(projContainer).toBeVisible(); // Esperar que la app reviva

    // 4. CARGAR Escenario
    page.once('dialog', async dialog => {
      const mensaje = dialog.message();
      console.log(`[Dialog Cargar] Mensaje: ${mensaje}`);
      
      // Buscamos el ID hexadecimal en la lista
      const match = mensaje.match(/([a-f0-9]{16})/); 
      
      if (match) {
          const idEncontrado = match[1];
          console.log(`[Test] ID encontrado: ${idEncontrado}`);
          await dialog.accept(idEncontrado);
      } else {
          await dialog.dismiss();
          throw new Error(`No se encontró ID en el prompt. Texto: "${mensaje}"`);
      }
    });

    await page.click('button:has-text("Gestionar Escenarios")'); // Nombre actualizado del botón

    // 5. Verificar carga exitosa
    // Si hay un alert de éxito al cargar, lo manejamos:
    // page.once('dialog', async dialog => await dialog.accept());
    
    await expect(page.locator('#error-state')).toBeHidden();
  });
});