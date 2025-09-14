/**
 * @fileoverview
 * Este módulo de configuración para una aplicación Node.js contiene
 * deliberadamente varios secretos y credenciales expuestas para
 * demostrar las capacidades de detección de Gitleaks.
 */

// -------------------------------------------------------------------
// FALLO 1: Claves de AWS expuestas
// -------------------------------------------------------------------
export function configurarAWS() {
  console.log("Configurando el SDK de AWS...");

  // Gitleaks detecta estas variables por su formato estándar.
  const awsAccessKeyId: string = "AKIAIOSFODNN7EXAMPLE";
  const awsSecretAccessKey: string = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

  // En una aplicación real, estas claves se usarían para inicializar un cliente.
  // const s3 = new AWS.S3({
  //   accessKeyId: awsAccessKeyId,
  //   secretAccessKey: awsSecretAccessKey,
  // });

  console.log("SDK de AWS configurado (simulación).");
  return { id: awsAccessKeyId, secret: awsSecretAccessKey };
}

// -------------------------------------------------------------------
// FALLO 2: Cadena de conexión de base de datos
// -------------------------------------------------------------------
export function obtenerConexionDB() {
  console.log("Generando la cadena de conexión a la base de datos...");

  const dbUsuario = "postgres_user";
  const dbContrasena = "P@ssw0rdMuyDificilDeAdivinar#"; // Contraseña en texto plano.
  const dbHost = "db.mi-servicio-privado.com";
  const dbNombre = "datos_clientes";

  // Gitleaks detecta la estructura de credenciales en URLs.
  const cadenaConexion = `postgres://${dbUsuario}:${dbContrasena}@${dbHost}:5432/${dbNombre}`;

  console.log("Cadena de conexión generada.");
  return cadenaConexion;
}

// -------------------------------------------------------------------
// FALLO 3: API Key genérica en el código
// -------------------------------------------------------------------
export function llamarApiExterna() {
  console.log("Llamando a una API de un tercero...");

  // La variable 'apiKey' es un objetivo común para Gitleaks.
  const apiKey = "ab1234cde-5678-90fg-h123-ijklm4567890";

  // const url = `https://api.proveedor.com/data?apiKey=${apiKey}`;
  // fetch(url);

  console.log("Llamada a API externa completada (simulación).");
  return apiKey;
}

// -------------------------------------------------------------------
// FALLO 4: Clave privada de tipo JWT/RSA
// -------------------------------------------------------------------
export function firmarJWT() {
  console.log("Firmando un token JWT con una clave privada...");

  // El formato con BEGIN/END es una señal de alerta inmediata para Gitleaks.
  const clavePrivadaRSA = `
    -----BEGIN RSA PRIVATE KEY-----
    MIIEogIBAAKCAQEA0Rz/U546A3Jb/2kf/7XztA7vHrLzTGERm7GfEpQhNGY2
    ... (contenido de clave falsa para la demostración) ...
    yGfK9eGWs/gTzY/i3b2w==
    -----END RSA PRIVATE KEY-----
  `;

  console.log("Token JWT firmado (simulación).");
  return clavePrivadaRSA.trim();
}

// -------------------------------------------------------------------
// FALLO 5: Token de Slack / Google
// -------------------------------------------------------------------
export function notificarPorSlack() {
  console.log("Enviando una notificación a un canal de Slack...");
  
  // El prefijo "xoxp-" es característico de los tokens de Slack.
  const slackToken = "xoxp-1234567890-ABCDEFGHIJKL-9876543210-zyxwvu";
  
  console.log("Notificación enviada (simulación).");
  return slackToken;
}

/**
 * Función principal para ejecutar todas las simulaciones.
 */
function main() {
  console.log("--- INICIANDO SCRIPT DE CONFIGURACIÓN VULNERABLE ---");
  configurarAWS();
  console.log("--------------------");
  obtenerConexionDB();
  console.log("--------------------");
  llamarApiExterna();
  console.log("--------------------");
  firmarJWT();
  console.log("--------------------");
  notificarPorSlack();
  console.log("--- SCRIPT FINALIZADO ---");
}

// Ejecutar la función principal.
main();