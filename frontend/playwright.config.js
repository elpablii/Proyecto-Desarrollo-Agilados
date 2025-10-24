// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', // Carpeta donde vivirán tus tests E2E
  fullyParallel: true,
  reporter: 'html', // Genera un reporte HTML
  use: {
    baseURL: 'http://127.0.0.1:5500', // Ajusta si tu servidor local usa otro puerto
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Puedes añadir Firefox, Webkit, etc.
  ],
  webServer: { // Opcional: Inicia tu servidor de desarrollo antes de los tests
    command: 'npm run start', // Asegúrate de tener un script 'start' en package.json
    url: 'http://127.0.0.1:5500',
    reuseExistingServer: !process.env.CI,
  },
});