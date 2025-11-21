// Importa funciones del cliente de autenticación
import { authClient } from '../authClient.js';
// Importa las funciones para buscar datos de malla y avance
import { fetchMalla, fetchAvance } from './mallaClient.js';
// Importa las nuevas funciones de proyección
import { computeProjection, renderProjection } from './proyeccion.js';
import { API_BASE_URL } from '../config.js';

// --- Elementos del DOM ---
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const mallaGridContainer = document.getElementById('malla-grid-container');
const mallaGrid = document.getElementById('malla-grid');
const mallaHeader = document.getElementById('malla-header');

/**
 * Función principal que se ejecuta al cargar el DOM.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar autenticación
    const isAuthenticated = await authClient.isAuthenticated();
    if (!isAuthenticated) {
        console.log('Usuario no autenticado, redirigiendo al login...');
        window.location.href = '/login.html';
        return;
    }
    
    // 2. Obtener parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const rut = params.get('rut');
    const codigoCarrera = params.get('codigo');
    const catalogo = params.get('catalogo');
    const nombreCarrera = params.get('nombre');

    if (nombreCarrera) {
        mallaHeader.textContent = `Malla Curricular - ${decodeURIComponent(nombreCarrera)}`;
    }

    if (!rut || !codigoCarrera || !catalogo) {
        mostrarError('Faltan parámetros en la URL.');
        return;
    }

    // 3. Cargar datos
    try {
        mostrarCarga(true);
        mostrarError(null);

        const [mallaData, avanceData] = await Promise.all([
            fetchMalla(codigoCarrera, catalogo),
            fetchAvance(rut, codigoCarrera)
        ]);
        
        // 4. Renderizar Malla Principal
        mostrarCarga(false);
        renderMalla(mallaData, avanceData);

        // 5. Proyección Interactiva (Modelo Predictivo)
        const projContainer = document.getElementById('proyeccion-container');
        
        try {
            // Intentar cargar la última guardada o generar una nueva por defecto
            let projection = null;
            try {
                const resp = await fetch(`${API_BASE_URL}/proyeccion?codigo=${encodeURIComponent(codigoCarrera)}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.proyecciones && data.proyecciones.length > 0) {
                        data.proyecciones.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                        projection = data.proyecciones[0].projection;
                        console.log('[Proyección] Cargada última versión guardada.');
                    }
                }
            } catch (e) { console.warn('No se pudo conectar con backend de proyecciones', e); }

            // Generar nueva si no existe guardada
            if (!projection) {
                projection = computeProjection(mallaData, avanceData, { 
                    maxCreditsPerSemester: 30, 
                    includeInProgressAsCompleted: false 
                });
                console.log('[Proyección] Generada por defecto (Algoritmo Predictivo).');
            }

            // Renderizar Panel de Proyección
            if (projection && projection.semesters && projContainer) {
                projContainer.style.display = 'block';
                
                renderProjection(projContainer, projection, {
                    maxCreditsPerSemester: 30,
                    rut,
                    codigo: codigoCarrera,
                    // Callback de Reset: recalcula con la lógica del modelo
                    onReset: () => computeProjection(mallaData, avanceData, { maxCreditsPerSemester: 30 }),
                    // Callback de Cambio: cuando el usuario mueve ramos
                    onSimulationChange: (updatedProj) => {
                        console.log("Simulación actualizada:", updatedProj);
                        // Futuro: actualizar malla principal para mostrar impacto
                        // highlightDelayedCourses(updatedProj);
                    }
                });
            }

        } catch (err) {
            console.warn('Error en módulo de proyección:', err);
        }

    } catch (error) {
        console.error('Error fatal:', error);
        mostrarError(error.message || 'Error desconocido.');
    }
});

/**
 * Renderiza la malla curricular visual (niveles).
 */
function renderMalla(malla, avance) {
    if (!malla || malla.length === 0) {
        mostrarError('No hay datos de malla.');
        return;
    }

    const aprobados = new Set(avance.filter(a => a.status === 'APROBADO').map(a => a.course));
    const reprobados = new Set(avance.filter(a => a.status === 'REPROBADO').map(a => a.course));
    const cursando = new Set(avance.filter(a => ['CURSANDO', 'INSCRITO'].includes(a.status)).map(a => a.course));

    const maxNivel = Math.max(...malla.map(a => a.nivel || 0));
    const nivelesMap = new Map();
    for (let i = 1; i <= maxNivel; i++) nivelesMap.set(i, []);
    
    malla.forEach(asignatura => {
        if (nivelesMap.has(asignatura.nivel)) nivelesMap.get(asignatura.nivel).push(asignatura);
    });

    mallaGrid.innerHTML = ''; 
    mallaGridContainer.style.display = 'block'; 

    for (let i = 1; i <= maxNivel; i++) {
        const nivelContainer = document.createElement('div');
        nivelContainer.className = 'malla-nivel';
        
        const nivelHeader = document.createElement('div');
        nivelHeader.className = 'malla-nivel-header';
        nivelHeader.textContent = `Nivel ${i}`;
        nivelContainer.appendChild(nivelHeader);

        const asignaturasNivel = nivelesMap.get(i) || [];
        
        asignaturasNivel.forEach(asignatura => {
            const card = document.createElement('div');
            card.className = 'asignatura-card';
            
            let estadoClass = 'asignatura-pendiente'; 
            if (aprobados.has(asignatura.codigo)) estadoClass = 'asignatura-aprobada';
            else if (reprobados.has(asignatura.codigo)) estadoClass = 'asignatura-reprobada';
            else if (cursando.has(asignatura.codigo)) estadoClass = 'asignatura-cursando';
            
            card.classList.add(estadoClass);
            card.dataset.codigo = asignatura.codigo; // Útil para buscarla luego

            card.innerHTML = `
                <div class="asignatura-nombre" title="${asignatura.asignatura}">${asignatura.asignatura}</div>
                <div class="asignatura-codigo">${asignatura.codigo}</div>
                <div class="asignatura-creditos">Créditos: ${asignatura.creditos}</div>
                ${asignatura.prereq ? `<div class="asignatura-prereq" title="${asignatura.prereq}">Req: ${asignatura.prereq.split(',').length}</div>` : ''}
            `;
            
            nivelContainer.appendChild(card);
        });
        mallaGrid.appendChild(nivelContainer);
    }
}

function mostrarCarga(mostrar) {
    if (loadingState) loadingState.style.display = mostrar ? 'flex' : 'none';
}

function mostrarError(mensaje) {
    if (errorState && errorMessage) {
        if (mensaje) {
            errorMessage.textContent = mensaje;
            errorState.style.display = 'block';
            mostrarCarga(false);
            mallaGridContainer.style.display = 'none';
        } else {
            errorState.style.display = 'none';
        }
    }
}