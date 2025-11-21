/**
 * Archivo de configuración central para el frontend.
 * Define constantes que pueden ser usadas en toda la aplicación.
 */

// Detectar si estamos en un entorno de navegador
const isBrowser = typeof window !== 'undefined';

// Define la URL base del servidor backend/proxy.
// Usa window.ENV_API_URL si está disponible (navegador), de lo contrario usa localhost.
export const API_BASE_URL = (isBrowser && window.ENV_API_URL) || 'http://localhost:3001';