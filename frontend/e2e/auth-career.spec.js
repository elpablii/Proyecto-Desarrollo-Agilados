import { test, expect } from '@playwright/test';

// URL base de la aplicación (la que sirve Nginx)
const BASE_URL = 'http://localhost:5500';

test.describe('Flujo completo de Login y Malla', () => {

  test('debería loguearse, navegar a la malla y ver asignaturas marcadas', async ({ page }) => {
    
    page.on('dialog', dialog => dialog.accept());

    // 1. Ir a la página de Login
    await page.goto(`${BASE_URL}/login.html`);

    // Usamos las credenciales de 'maria' del sessions.json
    await page.fill('#username', 'maria@example.com');
    await page.fill('#password', 'pass_maria');
    await page.click('button[type="submit"]');

    // 2. Esperar a ser redirigido al dashboard (dePrueba.html)
    // y verificar el saludo (basado en el RUT de maria)
    await page.waitForURL('**/dePrueba.html');
    await expect(page.locator('#saludo-usuario')).toHaveText('Bienvenido, 22.222.222-2!');

    // 3. Ir a la lista de carreras
    await page.click('a[href="carreras/carrerasUsuario.html"]');

    // 4. Esperar a la página de carreras y hacer clic en la carrera
    await page.waitForURL('**/carreras/carrerasUsuario.html');
    
    // Hacemos clic en el enlace de la carrera específica (basado en sessions.json)
    const carreraLink = page.locator('a:has-text("Ingeniería Civil Industrial (Coquimbo)")');
    await carreraLink.click();

    // 5. Esperar a navegar a la página de la malla
    // Verificamos que la URL contiene los parámetros correctos
    await page.waitForURL('**/malla/mallaCarrera.html?rut=22.222.222-2&codigo=8266&catalogo=202410**');
    
    // 6. Verificar que la malla se renderiza
    // Esperamos que el estado de carga desaparezca
    await expect(page.locator('#loading-state')).toBeHidden({ timeout: 10000 });
    // Verificamos que el contenedor de la malla esté visible
    await expect(page.locator('#malla-grid-container')).toBeVisible();

    // 7. Verificar estados de asignaturas (basado en el avance de 'maria' en sessions.json)

    // CÁLCULO I (MCN-101) debe estar APROBADA
    const calculo1 = page.locator('.asignatura-card:has-text("CÁLCULO I")');
    await expect(calculo1).toHaveClass(/asignatura-aprobada/);
    
    // CÁLCULO II (MCN-103) debe estar REPROBADA
    const calculo2 = page.locator('.asignatura-card:has-text("CÁLCULO II")');
    await expect(calculo2).toHaveClass(/asignatura-reprobada/);

    // PROGRAMACIÓN (ICC-101) debe estar CURSANDO
    const programacion = page.locator('.asignatura-card:has-text("PROGRAMACIÓN")');
    await expect(programacion).toHaveClass(/asignatura-cursando/);

    // QUÍMICA GENERAL (CST-101) debe estar PENDIENTE (no está en el avance)
    const quimica = page.locator('.asignatura-card:has-text("QUÍMICA GENERAL")');
    await expect(quimica).toHaveClass(/asignatura-pendiente/);
  });
});