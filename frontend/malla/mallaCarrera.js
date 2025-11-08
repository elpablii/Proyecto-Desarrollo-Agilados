// Importa funciones del cliente de autenticación
import { authClient } from '../authClient.js';
// Importa las funciones para buscar datos de malla y avance
import { fetchMalla, fetchAvance } from './mallaClient.js';
import { computeProjection, renderProjection } from './proyeccion.js';

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
         // *** CAMBIO: Usar ruta absoluta al login ***
    window.location.href = '/login.html'; // Ajusta la ruta al login
        return;
    }
    
    // 2. Obtener parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const rut = params.get('rut');
    const codigoCarrera = params.get('codigo');
    const catalogo = params.get('catalogo');
    const nombreCarrera = params.get('nombre');

    // Actualizar título
    if (nombreCarrera) {
        mallaHeader.textContent = `Malla Curricular - ${decodeURIComponent(nombreCarrera)}`;
    }

    // Validar parámetros
    if (!rut || !codigoCarrera || !catalogo) {
        mostrarError('Faltan parámetros (RUT, código o catálogo) en la URL.');
        // Añadir botón de demo para cargar fallback localmente
        const errorStateEl = document.getElementById('error-state');
        if (errorStateEl) {
            // Limpiar acciones previas
            let actionBar = document.getElementById('error-actions');
            if (actionBar) actionBar.remove();
            actionBar = document.createElement('div');
            actionBar.id = 'error-actions';
            actionBar.style.marginTop = '8px';

            const demoBtn = document.createElement('button');
            demoBtn.className = 'bg-blue-500 text-white px-3 py-1 rounded';
            demoBtn.textContent = 'Ver demo (malla fallback)';
            demoBtn.addEventListener('click', async () => {
                try {
                    mostrarCarga(true);
                    mostrarError(null);
                    // Cargar malla fallback desde archivos locales
                    // Use absolute path so fallback loads even when this page is served from /malla/
                    const resp = await fetch('/malla/malla-fallback.json');
                    if (!resp.ok) throw new Error('No se pudo cargar fallback local');
                    const mallaData = await resp.json();
                    const avanceData = []; // demo sin avance
                    mostrarCarga(false);
                    renderMalla(mallaData, avanceData);
                    // calcular y renderizar proyección
                    try {
                        const projection = computeProjection(mallaData, avanceData, { maxCreditsPerSemester: 30, includeInProgressAsCompleted: false });
                        const projContainer = document.getElementById('proyeccion-container');
                        if (projection && projection.semesters && projContainer) {
                            projContainer.style.display = 'block';
                            renderProjection(projContainer, projection, {
                                maxCreditsPerSemester: 30,
                                rut: 'demo',
                                codigo: 'demo',
                                onReset: () => computeProjection(mallaData, avanceData, { maxCreditsPerSemester: 30 })
                            });
                        }
                    } catch (err) {
                        console.warn('No se pudo calcular la proyección demo:', err);
                    }
                } catch (err) {
                    console.error('Error cargando demo:', err);
                    mostrarError('No se pudo cargar la malla de demo.');
                    mostrarCarga(false);
                }
            });

            const backLink = document.createElement('a');
            backLink.href = '../carreras/carrerasUsuario.html';
            backLink.className = 'ml-3 text-blue-600 hover:underline';
            backLink.textContent = 'Volver a Mis Carreras';

            actionBar.appendChild(demoBtn);
            actionBar.appendChild(backLink);
            errorStateEl.appendChild(actionBar);
        }

        return;
    }

    // 3. Cargar datos
    try {
        // Mostrar estado de carga
        mostrarCarga(true);
        mostrarError(null);

        // Pedir datos de malla y avance en paralelo
        const [mallaData, avanceData] = await Promise.all([
            fetchMalla(`${codigoCarrera}-${catalogo}`),
            fetchAvance(rut, codigoCarrera)
        ]);
        
        // 4. Renderizar
        mostrarCarga(false);
        renderMalla(mallaData, avanceData);

        // 5. Calcular y renderizar proyección por defecto
        try {
            const projection = computeProjection(mallaData, avanceData, { maxCreditsPerSemester: 30, includeInProgressAsCompleted: false });
            const projContainer = document.getElementById('proyeccion-container');
            if (projection && projection.semesters && projContainer) {
                projContainer.style.display = 'block';
                // pass list of aprobados so the projection module can validate prereqs on DnD
                const aprobados = new Set(aprobadosFromAvance(avanceData));
                renderProjection(projContainer, projection, {
                    maxCreditsPerSemester: 30,
                    rut,
                    codigo: codigoCarrera,
                    completed: Array.from(aprobados),
                    onReset: () => computeProjection(mallaData, avanceData, { maxCreditsPerSemester: 30 })
                });
            }
        } catch (err) {
            console.warn('No se pudo calcular la proyección por defecto:', err);
        }

    } catch (error) {
        // 5. Manejar errores
        console.error('Error al cargar datos:', error);
        mostrarError(error.message || 'Ocurrió un error desconocido.');
    }
});

/**
 * Renderiza la malla curricular en el DOM.
 * @param {Array} malla - Array de asignaturas de la malla.
 * @param {Array} avance - Array de registros de avance del estudiante.
 */
function renderMalla(malla, avance) {
    if (!malla || malla.length === 0) {
        mostrarError('No se encontraron datos de la malla para esta carrera.');
        return;
    }

    // 1. Procesar Avance: Crear un Set con los códigos de cursos APROBADOS
    // y otro para REPROBADOS/CURSANDO (simplificado)
    const aprobados = new Set(
        avance
            .filter(a => a.status === 'APROBADO')
            .map(a => a.course)
    );
    // Podríamos añadir más sets para 'REPROBADO', 'CURSANDO', 'INSCRITO'
    const reprobados = new Set(
        avance
            .filter(a => a.status === 'REPROBADO')
            .map(a => a.course)
    );
     const cursando = new Set(
        avance
            .filter(a => a.status === 'CURSANDO' || a.status === 'INSCRITO')
            .map(a => a.course)
    );

    // Helper to extract aprobados array
    window.aprobadosFromAvance = function(avanceArr) {
        return (avanceArr || []).filter(a => a.status === 'APROBADO').map(a => a.course);
    };


    // 2. Agrupar Malla por Nivel
    const maxNivel = Math.max(...malla.map(a => a.nivel || 0));
    const nivelesMap = new Map();
    for (let i = 1; i <= maxNivel; i++) {
        nivelesMap.set(i, []);
    }
    malla.forEach(asignatura => {
        if (nivelesMap.has(asignatura.nivel)) {
            nivelesMap.get(asignatura.nivel).push(asignatura);
        }
    });

    // 3. Limpiar y mostrar grid
    mallaGrid.innerHTML = ''; // Limpiar grid
    mallaGridContainer.style.display = 'block'; // Mostrar contenedor

    // 4. Renderizar cada nivel (columna)
    for (let i = 1; i <= maxNivel; i++) {
        const nivelContainer = document.createElement('div');
        nivelContainer.className = 'malla-nivel';
        
        // Añadir cabecera de nivel
        const nivelHeader = document.createElement('div');
        nivelHeader.className = 'malla-nivel-header';
        nivelHeader.textContent = `Nivel ${i}`; // O usar números romanos si se prefiere
        nivelContainer.appendChild(nivelHeader);

        const asignaturasNivel = nivelesMap.get(i) || [];
        
        // 5. Renderizar cada asignatura (tarjeta)
        asignaturasNivel.forEach(asignatura => {
            const card = document.createElement('div');
            card.className = 'asignatura-card';
            
            // Determinar estado
            let estadoClass = 'asignatura-pendiente'; // Por defecto
            if (aprobados.has(asignatura.codigo)) {
                estadoClass = 'asignatura-aprobada';
            } else if (reprobados.has(asignatura.codigo)) {
                estadoClass = 'asignatura-reprobada';
            } else if (cursando.has(asignatura.codigo)) {
                 estadoClass = 'asignatura-cursando';
            }
            card.classList.add(estadoClass);

            // Contenido de la tarjeta
            card.innerHTML = `
                <div class="asignatura-nombre" title="${asignatura.asignatura}">${asignatura.asignatura}</div>
                <div class="asignatura-codigo">${asignatura.codigo}</div>
                <div class="asignatura-creditos">Créditos: ${asignatura.creditos}</div>
                ${asignatura.prereq ? `<div class="asignatura-prereq" title="Prerrequisitos: ${asignatura.prereq}">Req: ${asignatura.prereq.split(',').length}</div>` : ''}
            `;
            
            // Añadir tooltip con prerrequisitos completos
            if (asignatura.prereq) {
                 card.title = `Prerrequisitos:\n${asignatura.prereq.replace(/,/g, '\n')}`;
            }

            nivelContainer.appendChild(card);
        });
        
        mallaGrid.appendChild(nivelContainer);
    }
}

/**
 * Muestra u oculta el indicador de carga.
 * @param {boolean} mostrar - True para mostrar, false para ocultar.
 */
function mostrarCarga(mostrar) {
    if (loadingState) {
        loadingState.style.display = mostrar ? 'flex' : 'none';
    }
}

/**
 * Muestra un mensaje de error o lo oculta si el mensaje es nulo.
 * @param {string | null} mensaje - El mensaje de error a mostrar.
 */
function mostrarError(mensaje) {
    if (errorState && errorMessage) {
        if (mensaje) {
            errorMessage.textContent = mensaje;
            errorState.style.display = 'block';
            mostrarCarga(false); // Ocultar carga si hay error
            mallaGridContainer.style.display = 'none'; // Ocultar malla si hay error
        } else {
            errorState.style.display = 'none';
        }
    }
}




