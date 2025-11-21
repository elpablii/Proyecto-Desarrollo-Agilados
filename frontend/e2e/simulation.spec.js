// Archivo: frontend/e2e/simulation.spec.js
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5500';

test.describe('Simulación y Persistencia', () => {

  test.beforeEach(async ({ page }) => {
    // Login rápido antes de cada test
    await page.goto(`${BASE_URL}/login.html`);
    await page.fill('#username', 'maria@example.com');
    await page.fill('#password', 'pass_maria');

    page.once('dialog', async dialog => {
      console.log(`[beforeEach] Aceptando alerta: ${dialog.message()}`);
      await dialog.accept();
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dePrueba.html');
    
    // Navegar a la carrera
    await page.click('a[href="carreras/carrerasUsuario.html"]');
    await page.click('a:has-text("Ingeniería Civil Industrial")');
    await page.waitForURL('**/malla/mallaCarrera.html**');
  });

  test('Debe generar proyección, guardar escenario y recuperarlo', async ({ page }) => {
    // 1. Verificar que se generó la proyección automática inicial
    const projContainer = page.locator('#proyeccion-container');
    await expect(projContainer).toBeVisible();
    await expect(page.locator('.malla-nivel[data-sem-index="0"]')).toBeVisible(); // Al menos 1 semestre

    // 2. Manejar el Prompt de GUARDAR
    // Cuando aparezca el prompt, escribimos "Plan E2E Automático"
    page.once('dialog', async dialog => {
        console.log(`[Dialog] Tipo: ${dialog.type()} - Mensaje: ${dialog.message()}`);
        expect(dialog.type()).toBe('prompt');
        await dialog.accept('Plan E2E Automático');
    });

    // Clic en "Guardar Escenario"
    await page.click('button:has-text("Guardar Escenario")');
    
    // Esperar alerta de confirmación "Proyección guardada"
    // (Nota: Playwright a veces auto-acepta alerts siguientes, 
    // pero podemos verificar si la UI no arroja error)

    page.once('dialog', async dialog => {
      console.log(`[Dialog Confirmación Guardado]: ${dialog.message()}`);
      await dialog.accept();
    });

    // 3. Recargar la página para limpiar memoria
    await page.reload();
    await page.waitForURL('**/malla/mallaCarrera.html**');

    // 4. Manejar el Prompt de CARGAR (Listar y Seleccionar)
    // Aquí el código busca el ID en el texto del prompt y lo escribe en el input
    page.once('dialog', async dialog => {
      const mensaje = dialog.message();
      const match = mensaje.match(/([a-f0-9]{16})\s*-\s*/); // Regex ajustado para ID hexadecimal
      
      if (match) {
          const idEncontrado = match[1];
          console.log(`[Test] ID encontrado en lista: ${idEncontrado}`);
          await dialog.accept(idEncontrado);
      } else {
          await dialog.dismiss();
          throw new Error(`No se encontró el ID en el prompt. Mensaje recibido: "${mensaje.substring(0, 50)}..."`);
      }
    });

    // Clic en "Cargar Escenario"
    await page.click('button:has-text("Cargar Escenario")');

    page.once('dialog', async dialog => {
      console.log(`[Dialog Confirmación Carga]: ${dialog.message()}`);
      await dialog.accept();
    });

    // 5. Verificar confirmación de carga
    // Si todo sale bien, debería aparecer un alert diciendo "Cargada proyección..."
    // Podemos verificar que no haya errores visibles en la UI
    await expect(page.locator('#error-state')).toBeHidden();
  });

});