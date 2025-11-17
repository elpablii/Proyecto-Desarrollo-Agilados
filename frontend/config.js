/**
 * Archivo de configuración central para el frontend.
 * Define constantes que pueden ser usadas en toda la aplicación.
 */

// Define la URL base del servidor backend/proxy.
// Para Docker: Si ambos servicios están en la misma red de Docker Compose,
// el frontend (navegador) accede al backend a través del puerto expuesto del host.
// Por defecto usa localhost, pero puede configurarse via variable de entorno
// en el servidor que sirve el frontend.
export const API_BASE_URL = window.ENV_API_URL || 'http://localhost:3001';
