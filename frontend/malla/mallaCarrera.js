// Importa funciones del cliente de autenticación
import { authClient } from '../authClient.js';
// Importa las funciones para buscar datos de malla y avance
import { fetchMalla, fetchAvance } from './mallaClient.js';
// Importa las nuevas funciones de proyección
import { computeProjection, renderProjection, detectarAlertaAcademica } from './proyeccion.js';
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

        // [DEBUG] Log para verificar datos cargados
        console.log('=== DEBUG DATOS CARGADOS ===');
        console.log('[DEBUG] mallaData:', mallaData?.length, 'ramos totales');
        console.log('[DEBUG] mallaData completa:', mallaData);
        console.log('[DEBUG] avanceData:', avanceData?.length, 'registros');
        console.log('[DEBUG] avanceData completa:', avanceData);
        console.log('[DEBUG] Códigos en malla:', mallaData?.map(m => m.codigo));
        console.log('[DEBUG] Cursos en avance:', avanceData?.map(a => ({ course: a.course, status: a.status })));
        console.log('=== FIN DEBUG ===');

        // 4. Renderizar Malla Principal
        mostrarCarga(false);
        renderMalla(mallaData, avanceData);

        // 5. Proyección Interactiva (Modelo Predictivo)
        const projContainer = document.getElementById('proyeccion-container');

        try {
            // [DISEÑO CORRECTO] La proyección interactiva:
            // 1. Toma los APROBADOS del historial real (avanceData) - estos NO aparecen
            // 2. Muestra solo los ramos PENDIENTES organizados por el algoritmo
            // 3. El usuario puede simular estados sobre los pendientes
            
            // Inicializar simulatedAvance con los APROBADOS reales del historial
            // Esto hace que el algoritmo los excluya automáticamente
            let simulatedAvance = avanceData
                .filter(r => r.status === 'APROBADO')
                .map(r => ({ course: r.course, status: 'APROBADO', period: r.period }));
            
            // fixedCourses: Posiciones fijas de ramos en semestres específicos
            let fixedCourses = new Map();
            
            // Los ramos que están CURSANDO en el historial real aparecen en Semestre 1
            avanceData.filter(r => ['CURSANDO', 'INSCRITO'].includes(r.status)).forEach(r => {
                // Agregarlos como CURSANDO en la simulación
                simulatedAvance.push({ course: r.course, status: 'CURSANDO', period: '2025-10' });
                fixedCourses.set(r.course, 0); // Fijar en Semestre 1
            });

            // Función para manejar el cambio de estado de un ramo
            const handleStatusChange = (courseCode) => {
                // [FIX CRÍTICO] Gestión de Historial vs Simulación
                // No debemos modificar registros históricos (pasados). Solo los de la simulación actual.
                const SIMULATION_PERIOD = '2025-10'; // Periodo de simulación
                
                let recordIndex = -1;
                let isHistorical = false;

                // Buscar el último registro
                for (let i = simulatedAvance.length - 1; i >= 0; i--) {
                    if (simulatedAvance[i].course === courseCode) {
                        recordIndex = i;
                        // Si el periodo es diferente al de simulación, es histórico
                        if (simulatedAvance[i].period !== SIMULATION_PERIOD) {
                            isHistorical = true;
                        }
                        break;
                    }
                }

                // Determinar estado actual
                // Si es histórico, para efectos de ciclo, tomamos su estado.
                // Pero si vamos a cambiarlo, crearemos uno NUEVO en el futuro.
                let currentStatus = recordIndex !== -1 ? simulatedAvance[recordIndex].status : 'PENDIENTE';
                
                // Ciclo: PENDIENTE -> CURSANDO -> APROBADO -> REPROBADO -> PENDIENTE
                let newStatus = 'PENDIENTE';
                
                // [SIMPLIFICADO] La validación de prerequisitos se hace SOLO al pasar a CURSANDO
                if (currentStatus === 'PENDIENTE') {
                    // Verificar prerrequisitos antes de permitir "CURSANDO"
                    const courseInfo = mallaData.find(c => c.codigo === courseCode);
                    
                    if (courseInfo && courseInfo.prereq) {
                        const prereqs = courseInfo.prereq.split(',').map(p => p.trim()).filter(p => p);
                        const missingPrereqs = prereqs.filter(p => {
                            return !simulatedAvance.some(r => r.course === p && r.status === 'APROBADO');
                        });

                        if (missingPrereqs.length > 0) {
                            alert(`🚫 No puedes cursar ${courseCode} porque faltan prerrequisitos:\n- ${missingPrereqs.join('\n- ')}`);
                            return;
                        }
                    }
                    
                    // [SIMPLIFICADO] No validamos créditos aquí.
                    // El algoritmo de proyección ya garantiza que cada semestre no exceda el límite.
                    // El usuario solo está cambiando el estado visual del ramo.
                    
                    newStatus = 'CURSANDO';
                }
                else if (currentStatus === 'CURSANDO') {
                    newStatus = 'APROBADO';
                }
                else if (currentStatus === 'APROBADO') {
                    newStatus = 'REPROBADO';
                }
                else if (currentStatus === 'REPROBADO') {
                    newStatus = 'PENDIENTE';
                }
                
                console.log(`Cambio de estado (Simulación): ${courseCode} ${currentStatus} -> ${newStatus}`);

                // Actualizar simulatedAvance
                if (isHistorical) {
                    // Si es histórico, NO lo tocamos.
                    // Si el nuevo estado NO es pendiente, agregamos un NUEVO registro futuro.
                    // Si es pendiente, simplemente no agregamos nada (volvemos al estado base donde solo existe el histórico).
                    if (newStatus !== 'PENDIENTE') {
                        simulatedAvance.push({ course: courseCode, status: newStatus, period: SIMULATION_PERIOD });
                    }
                } else {
                    // Si es un registro de simulación (actual), lo modificamos o borramos.
                    if (recordIndex !== -1) {
                        if (newStatus === 'PENDIENTE') {
                            simulatedAvance.splice(recordIndex, 1);
                        } else {
                            simulatedAvance[recordIndex].status = newStatus;
                        }
                    } else {
                        if (newStatus !== 'PENDIENTE') {
                            simulatedAvance.push({ course: courseCode, status: newStatus, period: SIMULATION_PERIOD });
                        }
                    }
                }
                
                // Actualizar fixedCourses
                if (newStatus === 'CURSANDO') fixedCourses.set(courseCode, 0);
                else if (newStatus === 'APROBADO') {
                    // Mantener en fixedCourses para que se visualice en el semestre actual (verde)
                    fixedCourses.set(courseCode, 0);
                }
                else if (newStatus === 'REPROBADO') {
                    // [NUEVO] Al reprobar, el ramo se queda fijo en Sem 1 (rojo)
                    // pero también necesitamos que aparezca como retake en el futuro.
                    // El algoritmo detectará que está REPROBADO y lo programará de nuevo.
                    fixedCourses.set(courseCode, 0);
                    
                    // [IMPORTANTE] Al cambiar a REPROBADO, debemos recalcular para mostrar el retake
                    // Llamamos updateProjectionUI después de refreshVisualStates
                }
                else {
                    // PENDIENTE - quitar de fijos
                    fixedCourses.delete(courseCode);
                }

                // Actualizar UI - Solo actualizar colores, NO recalcular automáticamente
                // La recalculación solo ocurre al presionar el botón "Recalcular"
                refreshVisualStates(); 
            };

            // [NUEVO] Función para actualizar SOLO los estilos visuales sin recalcular posiciones
            const refreshVisualStates = () => {
                if (!projContainer) return;
                
                // Reconstruir mapa de estados actual
                const courseStatusMap = new Map();
                simulatedAvance.forEach(r => courseStatusMap.set(r.course, r.status));
                
                // Iterar sobre todas las cards existentes y actualizar su estilo
                const allCards = projContainer.querySelectorAll('.asignatura-card');
                allCards.forEach(card => {
                    const codeSpan = card.querySelector('.font-mono');
                    if (!codeSpan) return;
                    const code = codeSpan.textContent.trim();
                    const status = courseStatusMap.get(code);
                    
                    // Limpiar clases anteriores
                    card.classList.remove(
                        'bg-blue-50', 'border-blue-200',
                        'bg-green-100', 'border-green-300',
                        'bg-red-100', 'border-red-300',
                        'bg-indigo-100', 'border-indigo-300', 'ring-2', 'ring-indigo-400'
                    );
                    
                    // Encontrar el indicador de estado (punto)
                    const indicator = card.querySelector('.absolute');
                    const titleDiv = card.querySelector('.font-bold.text-sm');
                    const courseInfo = mallaData.find(c => c.codigo === code);
                    const courseName = courseInfo ? courseInfo.asignatura : code;
                    
                    // Aplicar nuevo estilo según estado
                    let statusIcon = '';
                    let indicatorColor = 'bg-blue-400';
                    
                    if (status === 'APROBADO') {
                        card.classList.add('bg-green-100', 'border-green-300');
                        statusIcon = '✅ ';
                        indicatorColor = 'bg-green-500';
                    } else if (status === 'REPROBADO') {
                        card.classList.add('bg-red-100', 'border-red-300');
                        statusIcon = '❌ ';
                        indicatorColor = 'bg-red-500';
                    } else if (status === 'CURSANDO' || status === 'INSCRITO') {
                        card.classList.add('bg-indigo-100', 'border-indigo-300', 'ring-2', 'ring-indigo-400');
                        statusIcon = '✏️ ';
                        indicatorColor = 'bg-indigo-600';
                    } else {
                        // PENDIENTE o sin estado
                        card.classList.add('bg-blue-50', 'border-blue-200');
                        indicatorColor = 'bg-blue-400';
                    }
                    
                    // Actualizar icono y color del indicador
                    if (titleDiv) titleDiv.innerHTML = `${statusIcon}${courseName}`;
                    if (indicator) {
                        indicator.className = `absolute top-1 right-1 w-2 h-2 rounded-full ${indicatorColor}`;
                    }
                });
                
                // [NUEVO] Actualizar el panel de Estado Académico según la simulación
                updateStatusPanel();
            };
            
            // [NUEVO] Función para actualizar el panel de Estado Académico
            const updateStatusPanel = () => {
                const isAlert = detectarAlertaAcademica(simulatedAvance);
                const maxCredits = isAlert ? 15 : 30;
                
                // Buscar el panel de estado existente
                const statusPanel = projContainer.querySelector('.status-panel');
                if (statusPanel) {
                    // Actualizar clases y contenido
                    statusPanel.className = `status-panel mb-4 p-4 rounded-lg border-l-4 shadow-sm flex flex-wrap justify-between items-center ${
                        isAlert ? 'bg-red-50 border-red-500 text-red-900' : 'bg-green-50 border-green-500 text-green-900'
                    }`;
                    
                    const titleEl = statusPanel.querySelector('h3');
                    const subtitleEl = statusPanel.querySelector('p');
                    
                    if (titleEl) {
                        titleEl.innerHTML = isAlert 
                            ? '🚫 ALERTA ACADÉMICA (Simulación)' 
                            : '✅ Estado Académico Regular';
                    }
                    if (subtitleEl) {
                        subtitleEl.innerHTML = `Carga máxima: <strong>${maxCredits} créditos</strong>.`;
                    }
                }
            };

            // Función principal para recalcular y renderizar
            const updateProjectionUI = (preserveStructure = false, ignoreCodeForFreeze = null) => {
                if (!projContainer) return;
                projContainer.style.display = 'block';

                // [FIX] Si es recálculo completo (botón), limpiamos fixedCourses de lo automático
                // Solo mantenemos lo que el usuario explícitamente fijó (Semestre 1 o manuales)
                // Pero como fixedCourses mezcla todo, es difícil distinguir.
                // Estrategia: Si preserveStructure es false, computeProjection ignorará fixedCourses para lo no-fijo?
                // No, computeProjection respeta fixedCourses siempre.
                // Entonces, si queremos recalcular, debemos limpiar fixedCourses antes?
                // El usuario espera que "Recalcular" optimice.
                // Vamos a asumir que "Recalcular" limpia todo MENOS lo que está en Semestre 1 (Cursando).
                
                let projectionOptions = {
                    maxCreditsPerSemester: 30,
                    includeInProgressAsCompleted: false,
                    fixedCourses: fixedCourses,
                    preserveStructure: preserveStructure
                };

                if (preserveStructure) {
                    // [NUEVO] Congelar la estructura visual actual antes de recalcular
                    // Leemos el DOM para ver dónde está cada ramo y lo fijamos ahí.
                    const currentSemesters = document.querySelectorAll('.malla-nivel');
                    currentSemesters.forEach((semDiv, semIdx) => {
                        const cards = semDiv.querySelectorAll('.asignatura-card');
                        cards.forEach(card => {
                            const codeSpan = card.querySelector('.font-mono');
                            if (codeSpan) {
                                const code = codeSpan.textContent.trim();
                                // Solo fijamos si no estaba ya fijado (para no sobrescribir lógica manual)
                                // Y si NO es el código que acabamos de modificar (ignoreCodeForFreeze)
                                if (code !== ignoreCodeForFreeze && !fixedCourses.has(code)) {
                                    fixedCourses.set(code, semIdx);
                                }
                            }
                        });
                    });
                } else {
                    // Limpiar fixedCourses dejando solo Semestre 0 (Cursando)
                    const newFixed = new Map();
                    fixedCourses.forEach((semIdx, code) => {
                        if (semIdx === 0) newFixed.set(code, 0);
                    });
                    fixedCourses = newFixed;
                    projectionOptions.fixedCourses = fixedCourses;
                }

                // 1. Recalcular proyección con las restricciones actuales (fixedCourses) y DATOS SIMULADOS
                const projection = computeProjection(mallaData, simulatedAvance, projectionOptions);

                // Calcular aprobados para validación
                const completedCourses = new Set(
                    simulatedAvance.filter(r => r.status === 'APROBADO').map(r => r.course)
                );

                // [NUEVO] Mapa de estados para estilos visuales
                const courseStatusMap = new Map();
                simulatedAvance.forEach(r => courseStatusMap.set(r.course, r.status));

                // 2. Renderizar
                renderProjection(projContainer, projection, {
                    maxCreditsPerSemester: 30,
                    rut,
                    codigo: codigoCarrera,
                    completedCourses: completedCourses, // [FIX] Pasar aprobados para validación estricta
                    fixedCourses: fixedCourses,         // [FIX] Pasar fijos para estilo visual
                    courseStatusMap: courseStatusMap,   // [NUEVO] Pasar mapa de estados
                    
                    onReset: () => {
                        // Resetear simulación al estado basado en historial real
                        simulatedAvance = avanceData
                            .filter(r => r.status === 'APROBADO')
                            .map(r => ({ course: r.course, status: 'APROBADO', period: r.period }));
                        
                        fixedCourses.clear();
                        
                        // Restaurar los CURSANDO del historial real
                        avanceData.filter(r => ['CURSANDO', 'INSCRITO'].includes(r.status)).forEach(r => {
                            simulatedAvance.push({ course: r.course, status: 'CURSANDO', period: '2025-10' });
                            fixedCourses.set(r.course, 0);
                        });
                        
                        updateProjectionUI(false); // Reset completo, recalcular todo
                        return null; // [FIX] Retornar null para que proyeccion.js no renderice doble
                    },
                    
                    onSimulationChange: (updatedProj) => {
                        // 1. Detectar cambios en Semestre 1 (Automático -> Cursando)
                        const sem1 = updatedProj.semesters[0];
                        const sem1Codes = new Set(sem1 ? sem1.courses.map(c => c.codigo) : []);
                        
                        // A. Cursos que entraron a Sem 1 -> CURSANDO
                        sem1Codes.forEach(code => {
                            const record = simulatedAvance.find(r => r.course === code);
                            // Si no existe o es PENDIENTE, lo pasamos a CURSANDO
                            if (!record) {
                                simulatedAvance.push({ course: code, status: 'CURSANDO', period: '2025-10' });
                            } else if (record.status === 'PENDIENTE') {
                                record.status = 'CURSANDO';
                            }
                        });

                        // B. Cursos que salieron de Sem 1 -> PENDIENTE (si eran CURSANDO)
                        simulatedAvance.forEach(record => {
                            if (record.status === 'CURSANDO' && !sem1Codes.has(record.course)) {
                                record.status = 'PENDIENTE';
                            }
                        });

                        // Limpiar registros PENDIENTES redundantes (opcional, pero mantiene limpio)
                        for (let i = simulatedAvance.length - 1; i >= 0; i--) {
                            if (simulatedAvance[i].status === 'PENDIENTE') {
                                simulatedAvance.splice(i, 1);
                            }
                        }

                        // 2. Actualizar fixedCourses con las nuevas posiciones
                        updatedProj.semesters.forEach((sem, idx) => {
                            sem.courses.forEach(c => {
                                fixedCourses.set(c.codigo, idx);
                            });
                        });
                        
                        // NO recalculamos automáticamente. Solo actualizamos el estado interno.
                        // El usuario debe presionar "Recalcular" para optimizar.
                        // Pero sí actualizamos la UI para reflejar los cambios de color (Azul <-> Indigo)
                        updateProjectionUI(true);
                    },

                    onRecalculate: () => {
                        updateProjectionUI(false); // Recálculo inteligente (optimizar)
                    },

                    onCourseStatusChange: handleStatusChange
                });

                // Opcional: Si queremos mostrar impacto en la malla principal pero sin cambiar datos,
                // podemos usar highlightDelayedCourses, pero asegurándonos que no confunda.
                // highlightDelayedCourses(projection); 
            };

            // Inicializar
            updateProjectionUI();

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

    // 1. Crear un mapa para traducir Código -> Nombre
    const nombreAsignaturaMap = new Map();
    malla.forEach(a => {
        nombreAsignaturaMap.set(a.codigo, a.asignatura);
    });

    const aprobados = new Set(avance.filter(a => a.status === 'APROBADO').map(a => a.course));
    const reprobados = new Set(avance.filter(a => a.status === 'REPROBADO').map(a => a.course));
    const cursando = new Set(avance.filter(a => ['CURSANDO', 'INSCRITO'].includes(a.status)).map(a => a.course));

    // [NUEVO] Contar intentos por asignatura
    const intentosMap = new Map();
    avance.forEach(record => {
        if (record.course) {
            const count = intentosMap.get(record.course) || 0;
            intentosMap.set(record.course, count + 1);
        }
    });

    // [NUEVO] Identificar cursos causantes de Alerta Académica
    const dangerCourses = new Set();
    const historialOrdenado = [...avance].sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    const intentosPorCursoCalc = {};
    const reprobacionesPorSemestre = {};

    console.log("[Alerta] Analizando historial para detectar alertas...", historialOrdenado);

    for (const registro of historialOrdenado) {
        const codigo = (registro.course || '').trim();
        const periodo = registro.period;
        const estado = (registro.status || '').toUpperCase();

        if (!codigo) continue;

        if (!intentosPorCursoCalc[codigo]) intentosPorCursoCalc[codigo] = 0;
        intentosPorCursoCalc[codigo]++;
        const numeroIntento = intentosPorCursoCalc[codigo];

        // Regla General: Si tienes 3 o más intentos, es alerta
        // [FIX] Pero solo si el ramo NO está aprobado actualmente
        if (numeroIntento >= 3 && !aprobados.has(codigo)) {
             dangerCourses.add(codigo);
        }

        if (estado === 'REPROBADO' || estado === 'R') {
            if (periodo) {
                if (!reprobacionesPorSemestre[periodo]) reprobacionesPorSemestre[periodo] = [];
                reprobacionesPorSemestre[periodo].push({ codigo, intento: numeroIntento });
            }
        }
    }
    // Regla 1: Reprobar 2 asignaturas en 2da oportunidad en el mismo semestre
    // [FIX] Solo marcar como peligrosos si NO están aprobados actualmente
    for (const [periodo, listaReprobados] of Object.entries(reprobacionesPorSemestre)) {
        const segundas = listaReprobados.filter(r => r.intento === 2);
        if (segundas.length >= 2) {
            console.log(`[Alerta] Semestre ${periodo} tiene ${segundas.length} reprobaciones en 2do intento`);
            segundas.forEach(r => {
                // Solo agregar si el ramo NO está aprobado
                if (!aprobados.has(r.codigo)) {
                    dangerCourses.add(r.codigo);
                }
            });
        }
    }
    
    console.log("[Alerta] Cursos marcados como peligrosos:", [...dangerCourses]);

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
            card.dataset.codigo = asignatura.codigo;

            // [NUEVO] Highlight de Alerta Académica
            // [FIX] Solo aplicar alerta si el ramo NO está aprobado
            let alertIcon = '';
            if (dangerCourses.has(asignatura.codigo) && !aprobados.has(asignatura.codigo)) {
                card.style.setProperty('border', '3px solid #ef4444', 'important'); // Red-500
                card.style.setProperty('box-shadow', '0 0 10px rgba(239, 68, 68, 0.5)', 'important');
                card.classList.add('animate-pulse'); 
                card.title += " \n⚠️ CAUSA DE ALERTA ACADÉMICA";
                // Forzar un fondo rojizo suave para destacar
                card.style.setProperty('background-color', '#fee2e2', 'important'); // red-100
                alertIcon = `<div style="position:absolute; top:-10px; left:-10px; font-size:24px; z-index:20; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">⚠️</div>`;
            }

            // [NUEVO] Badge de Intentos
            let intentosBadge = '';
            const intentos = intentosMap.get(asignatura.codigo) || 0;
            if (intentos > 0) {
                // [FIX] Si está aprobado, el badge es verde (éxito)
                let badgeStyle = '';
                
                if (aprobados.has(asignatura.codigo)) {
                    // Estilo Éxito (Verde) - Ramo aprobado
                    badgeStyle = 'background-color: #22c55e; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; position: absolute; top: -5px; right: -5px; z-index: 15; border: 1px solid white;';
                }
                // Estilo Alerta (Rojo) - Solo si NO está aprobado
                else if (dangerCourses.has(asignatura.codigo) || intentos >= 3) {
                    badgeStyle = 'background-color: #ef4444; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; position: absolute; top: -8px; right: -8px; z-index: 20; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 2px solid white;';
                } 
                // Estilo Warning (Naranja)
                else if (intentos === 2) {
                    badgeStyle = 'background-color: #f59e0b; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; position: absolute; top: -5px; right: -5px; z-index: 15; border: 1px solid white;';
                }
                // Estilo base (azul)
                else {
                    badgeStyle = 'background-color: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; position: absolute; top: -5px; right: -5px; z-index: 15; border: 1px solid white;';
                }

                intentosBadge = `<div style="${badgeStyle}" title="${intentos}ª oportunidad">${intentos}</div>`;
            }

            // 2. Generar el texto del tooltip con Nombres
            let tooltipText = "";
            if (asignatura.prereq) {
                const codigosReq = asignatura.prereq.split(',');
                const nombresReq = codigosReq.map(c => {
                    const nombre = nombreAsignaturaMap.get(c.trim());
                    // Si encontramos el nombre lo usamos, si no, dejamos el código (por si es externo)
                    return nombre ? `• ${nombre}` : `• ${c}`;
                });
                tooltipText = "Prerrequisitos:\n" + nombresReq.join('\n');
            }

            card.innerHTML = `
                ${alertIcon}
                ${intentosBadge}
                <div class="asignatura-nombre" title="${asignatura.asignatura}">${asignatura.asignatura}</div>
                <div class="asignatura-codigo">${asignatura.codigo}</div>
                <div class="asignatura-creditos">Créditos: ${asignatura.creditos}</div>
                ${asignatura.prereq ?
                    `<div class="asignatura-prereq" title="${tooltipText}">Req: ${asignatura.prereq.split(',').length}</div>`
                    : ''}
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

function highlightDelayedCourses(projection) {
    // 1. Limpiar estilos previos de simulación
    document.querySelectorAll('.asignatura-card').forEach(card => {
        card.classList.remove('border-orange-500', 'border-4', 'opacity-50');
    });

    if (!projection || !projection.semesters) return;

    // 2. Recorrer la proyección para ver cuándo se toma cada ramo
    projection.semesters.forEach((sem, index) => {
        const semestreNumero = index + 1;

        sem.courses.forEach(curso => {
            // Buscar la tarjeta en la malla principal
            const card = document.querySelector(`.asignatura-card[data-codigo="${curso.codigo}"]`);
            if (card) {
                // Lógica de ejemplo: Si el ramo se toma después del semestre 5, marcarlo
                // O podrías comparar contra el "nivel" ideal del ramo.
                if (semestreNumero > curso.nivel) {
                    // Ramo atrasado visualmente
                    card.classList.add('border-orange-500', 'border-2');
                    card.title = `Proyectado para semestre ${semestreNumero} (Atrasado)`;
                }
            }
        });
    });
}