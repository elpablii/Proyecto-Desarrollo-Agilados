/**
 * Módulo de proyección de malla curricular Inteligente (Sprint Fusionado)
 * Incluye:
 * 1. Detección de Alerta Académica.
 * 2. Algoritmo de priorización por puntaje.
 * 3. Renderizado de UI avanzada (Panel de estado, Drag & Drop validado, Menú).
 */

import { API_BASE_URL } from '../config.js';

/* ==========================================
   SECCIÓN 1: LÓGICA Y ALGORITMOS (MODELO)
   ========================================== */

/**
 * Detecta si el estudiante está en Alerta Académica según el historial.
 * Reglas:
 * 1. Reprobar 2 asignaturas en 2da oportunidad en el mismo semestre.
 * 2. Reprobar 1 asignatura en 3ra oportunidad.
 * @param {Array} avance - Historial académico completo
 * @returns {boolean} - True si está en alerta, False si no.
 */
export function detectarAlertaAcademica(avance) {
    if (!avance || avance.length === 0) return false;

    const intentosPorCurso = {}; // Map<codigo, int>
    const reprobacionesPorSemestre = {}; // Map<periodo, Array<{codigo, intento}>>

    // Ordenar cronológicamente (es importante para contar intentos en orden)
    const historialOrdenado = [...avance].sort((a, b) => (a.period || '').localeCompare(b.period || ''));

    for (const registro of historialOrdenado) {
        const codigo = registro.course;
        const periodo = registro.period;
        const estado = registro.status;

        if (!intentosPorCurso[codigo]) intentosPorCurso[codigo] = 0;
        
        // Contamos intento
        intentosPorCurso[codigo]++;
        const numeroIntento = intentosPorCurso[codigo];

        if (estado === 'REPROBADO') {
            // Regla 2: Reprobar en 3ra oportunidad
            if (numeroIntento >= 3) return true;

            if (!reprobacionesPorSemestre[periodo]) reprobacionesPorSemestre[periodo] = [];
            reprobacionesPorSemestre[periodo].push({ codigo, intento: numeroIntento });
        }
    }

    // Regla 1: Reprobar 2 asignaturas en 2da oportunidad en el mismo semestre
    for (const [periodo, reprobados] of Object.entries(reprobacionesPorSemestre)) {
        const segundasOportunidades = reprobados.filter(r => r.intento === 2);
        if (segundasOportunidades.length >= 2) return true;
    }

    return false;
}

/**
 * Calcula la profundidad de la cadena de dependencias (Critical Path).
 * @param {string} codigo - Código del curso
 * @param {Map} grafo - Mapa de dependencias inversas (quién desbloquea a quién)
 * @param {Map} memo - Cache para memoización
 */
function calcularProfundidad(codigo, grafo, memo = new Map()) {
    if (memo.has(codigo)) return memo.get(codigo);
    
    const desbloquea = grafo.get(codigo) || new Set();
    if (desbloquea.size === 0) {
        memo.set(codigo, 0);
        return 0;
    }

    let maxDepth = 0;
    for (const hijo of desbloquea) {
        maxDepth = Math.max(maxDepth, 1 + calcularProfundidad(hijo, grafo, memo));
    }
    
    memo.set(codigo, maxDepth);
    return maxDepth;
}

/**
 * Calcula un "Puntaje de Prioridad" para una asignatura.
 */
function calcularPrioridad(asignatura, grafoDependencias, memoProfundidad) {
    let puntaje = 0;
    // Prioridad 1: Nivel bajo (urgente). Invertimos nivel: 1->200 pts, 10->110 pts
    puntaje += (20 - (asignatura.nivel || 10)) * 100; // [MEJORA] Aumentar peso del nivel
    
    // Prioridad 2: Cadena Crítica (cuántos niveles de ramos dependen de este)
    // Usamos la profundidad recursiva en lugar de solo los hijos directos
    const profundidad = calcularProfundidad(asignatura.codigo, grafoDependencias, memoProfundidad);
    puntaje += profundidad * 50; // [MEJORA] Peso alto para cadenas largas

    // Prioridad 3: Desbloqueo directo (cantidad de hijos inmediatos)
    const desbloquea = grafoDependencias.get(asignatura.codigo) || new Set();
    puntaje += desbloquea.size * 10;

    // Prioridad 4: Créditos (para llenar huecos pequeños)
    puntaje += (asignatura.creditos || 0);
    
    return puntaje;
}

/**
 * Calcula fecha estimada de egreso.
 */
function calcularFechaEgreso(semestresRestantes) {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1; 
    let currentSem = month <= 6 ? 1 : 2; // Semestre actual aproximado
    
    for(let i=0; i < semestresRestantes; i++) {
        if(currentSem === 1) {
            currentSem = 2;
        } else {
            currentSem = 1;
            year++;
        }
    }
    return `${year}-${currentSem}0`; 
}

/**
 * Genera la proyección semestre a semestre (Greedy Algorithm).
 */
export function computeProjection(malla, avance, options = {}) {
    let maxCredits = options.maxCreditsPerSemester || 30;
    const includeInProgress = !!options.includeInProgressAsCompleted;
    const fixedCourses = options.fixedCourses || new Map(); // Map<codigo, semesterIndex>
    const preserveStructure = !!options.preserveStructure; // [NUEVO] Flag para mantener estructura

    if (!Array.isArray(malla)) return { semesters: [], warnings: ['Malla inválida o vacía'] };

    // 1. Detección de Alerta
    const enAlerta = detectarAlertaAcademica(avance);
    const warnings = [];
    
    if (enAlerta) {
        maxCredits = 15; // Regla de negocio
        warnings.push('ALERTA ACADÉMICA DETECTADA: Carga máxima reducida a 15 créditos.');
    }

    // 2. Construcción de Grafos
    const mallaByCode = new Map();
    const dependenciasInversas = new Map(); 

    for (const a of malla) {
        mallaByCode.set(a.codigo, { 
            ...a, 
            prereqList: (a.prereq || '').split(',').map(s => s.trim()).filter(Boolean) 
        });
        if(!dependenciasInversas.has(a.codigo)) dependenciasInversas.set(a.codigo, new Set());
    }

    for (const [codigo, curso] of mallaByCode.entries()) {
        for (const pre of curso.prereqList) {
            if (dependenciasInversas.has(pre)) dependenciasInversas.get(pre).add(codigo);
        }
    }

    // 3. Estado actual
    const completed = new Set(
        (avance || []).filter(r => r.status === 'APROBADO').map(r => r.course)
    );
    if (includeInProgress) {
        (avance || []).filter(r => r.status === 'CURSANDO' || r.status === 'INSCRITO')
            .forEach(r => completed.add(r.course));
    }

    // [NUEVO DISEÑO] Los ramos APROBADOS en el historial simulado NO aparecen en la proyección.
    // Los ramos REPROBADOS aparecen en su semestre fijo Y también como retake en el futuro.
    const reprobados = new Set(
        (avance || []).filter(r => r.status === 'REPROBADO').map(r => r.course)
    );
    
    const remaining = new Set([...mallaByCode.keys()].filter(code => {
        // Si está APROBADO en la simulación, NO aparece (ya lo "aprobaste")
        if (completed.has(code)) return false;
        // El resto aparece (PENDIENTE, CURSANDO, REPROBADO o sin estado)
        return true;
    }));
    
    // [NUEVO] Agregar los reprobados al remaining para que se programen como retake
    // (ya están en remaining si no están aprobados, pero nos aseguramos)
    reprobados.forEach(code => {
        if (!completed.has(code)) {
            remaining.add(code);
        }
    });
    
    const semesters = [];
    const scheduled = new Set();
    // [NUEVO] Set para rastrear qué cursos se han "aprobado" dentro de la simulación (para prerequisitos)
    // Inicialmente contiene los aprobados históricos.
    const projectedPassed = new Set(completed);

    function prereqsSatisfied(code) {
        const pList = mallaByCode.get(code).prereqList || [];
        for (const p of pList) {
            if (projectedPassed.has(p)) continue;
            // Nota: 'scheduled' ya no es suficiente, necesitamos saber si se aprobó en un semestre ANTERIOR.
            // En el algoritmo greedy, procesamos semestre a semestre, así que si está en projectedPassed, está ok.
            return false;
        }
        return true;
    }

    // [NUEVO] Lógica para preservar estructura (Modo Edición Manual)
    if (preserveStructure) {
        // En este modo, confiamos ciegamente en fixedCourses para armar los semestres.
        // Solo rellenamos lo que falta si es estrictamente necesario o solicitado.
        // Pero para "click y que no se mueva nada", lo mejor es reconstruir los semestres
        // tal cual estaban, quitando lo aprobado y agregando lo nuevo al final.
        
        // Determinar cuántos semestres necesitamos (el máximo índice en fixedCourses)
        let maxSemIndex = -1;
        for(const idx of fixedCourses.values()) {
            if(idx > maxSemIndex) maxSemIndex = idx;
        }
        
        // Crear estructura vacía
        for(let i=0; i <= maxSemIndex; i++) {
            semesters.push({ courses: [], credits: 0 });
        }

        // Llenar con lo que está fijado Y sigue pendiente
        const unassigned = [];
        for(const code of remaining) {
            if(fixedCourses.has(code)) {
                const idx = fixedCourses.get(code);
                const course = mallaByCode.get(code);
                // Validar existencia del semestre (por si acaso)
                while(semesters.length <= idx) semesters.push({ courses: [], credits: 0 });
                
                semesters[idx].courses.push({ ...course, fixed: true });
                semesters[idx].credits += (course.creditos || 0);
                scheduled.add(code);

                // [FIX] Si está reprobado, también debe aparecer como pendiente para el futuro
                const lastStatus = (avance || []).filter(r => r.course === code).pop()?.status;
                if (lastStatus === 'REPROBADO') {
                    unassigned.push({ code, isRetake: true });
                }
            } else {
                unassigned.push({ code, isRetake: false });
            }
        }

        // Los que sobran (nuevos pendientes o des-fijados) van a una "bolsa" o al final
        // Para simplificar, los agregamos al primer semestre con cupo o creamos nuevos al final
        // PERO solo si no están programados.
        // Si acabas de reprobar un ramo, entra aquí.
        
        if(unassigned.length > 0) {
             // Estrategia simple: Ponerlos al final para no romper lo existente
             let lastSem = semesters[semesters.length - 1];
             if(!lastSem) { lastSem = { courses: [], credits: 0 }; semesters.push(lastSem); }
             
             for(const item of unassigned) {
                 const code = item.code;
                 const course = mallaByCode.get(code);
                 // Crear nuevo semestre si el último está lleno
                 if(lastSem.credits + course.creditos > maxCredits) {
                     lastSem = { courses: [], credits: 0 };
                     semesters.push(lastSem);
                 }
                 
                 const newCourseObj = { ...course, fixed: false };
                 if (item.isRetake) newCourseObj.isRetake = true;
                 
                 lastSem.courses.push(newCourseObj); // No fijo, es nuevo
                 lastSem.credits += course.creditos;
                 // Actualizamos fixedCourses implícitamente para la próxima? No, eso lo hace la UI.
             }
        }

        return { 
            semesters, 
            warnings, 
            totalSemesters: semesters.length,
            studentStatus: enAlerta ? 'ALERTA' : 'REGULAR',
            maxCreditsAllowed: maxCredits,
            estimatedGraduation: calcularFechaEgreso(semesters.filter(s => s.courses.length > 0).length)
        };
    }

    // 4. Loop de Programación (Algoritmo Greedy Original - Modo Recálculo)
    let currentSemIndex = 0;
    // Safety break to prevent infinite loops
    while (remaining.size > 0 && currentSemIndex < 20) {
        const semester = { courses: [], credits: 0 };
        
        // [MEJORA] Lógica de Alerta Académica Dinámica
        // Si estamos en alerta, el PRIMER semestre proyectado (el actual) tiene restricción.
        // Asumimos que si el estudiante aprueba este semestre, la alerta se levanta para los siguientes.
        let currentMaxCredits = (enAlerta && currentSemIndex === 0) ? 15 : 30;

        // A. Identificar cursos forzados para este semestre
        const forcedForThisSem = [];
        for (const code of remaining) {
            if (fixedCourses.has(code) && fixedCourses.get(code) === currentSemIndex) {
                forcedForThisSem.push(mallaByCode.get(code));
            }
        }

        // Verificar prerrequisitos de los forzados (si no se cumplen, es un estado inválido pero lo intentamos)
        for (const course of forcedForThisSem) {
            // [FIX] Validar límite de créditos también para cursos forzados
            const courseCredits = course.creditos || 0;
            if (semester.credits + courseCredits > currentMaxCredits) {
                warnings.push(`Curso ${course.codigo} no cabe en semestre ${currentSemIndex + 1} (excede ${currentMaxCredits} cr).`);
                // No lo agregamos a este semestre, se programará en uno futuro
                continue;
            }
            
            if (prereqsSatisfied(course.codigo)) {
                semester.courses.push({ ...course, prereqSatisfied: true, fixed: true });
                semester.credits += courseCredits;
                scheduled.add(course.codigo);
                
                // [FIX REPROBADO] Si el curso está reprobado en la simulación, NO lo quitamos de remaining
                // para que se vuelva a programar en el futuro.
                // Necesitamos saber el estado simulado. Lo buscamos en 'avance' (que es simulatedAvance).
                const lastStatus = (avance || []).filter(r => r.course === course.codigo).pop()?.status;
                
                if (lastStatus === 'REPROBADO') {
                    // Es un reprobado visual. Lo mostramos aquí, pero NO lo borramos de remaining.
                    // IMPORTANTE: Si no lo borramos, el algoritmo intentará programarlo de nuevo en el siguiente ciclo.
                    // Esto es correcto.
                } else {
                    remaining.delete(course.codigo);
                }
            } else {
                warnings.push(`Curso fijado ${course.codigo} en semestre ${currentSemIndex + 1} no cumple prerrequisitos.`);
            }
        }

        // [NUEVO] Memoización para profundidad
        const memoProfundidad = new Map();
        let eligible = []; // [FIX] Definir fuera del if para evitar crash en deadlock check

        // B. Llenar con cursos elegibles (no forzados a otros semestres)
        // [CAMBIO] Permitimos rellenar el Semestre 1 (Actual) automáticamente.
        // El usuario quiere ver sugerencias y que no desaparezcan los ramos.
        const isCurrentSemester = currentSemIndex === 0;
        
        // Eliminamos la restricción 'if (!isCurrentSemester)' para que el algoritmo llene todos los semestres
        {
            for (const code of remaining) {
                // [FIX] Si ya está programado en ESTE semestre (como forzado), no lo consideramos
                // Pero si es un retake (reprobado en semestre anterior), SÍ lo consideramos
                const isReprobadoRetake = reprobados.has(code) && currentSemIndex > 0;
                
                if (scheduled.has(code) && !isReprobadoRetake) continue;
                
                // Si está fijado a un semestre FUTURO, no lo tocamos
                if (fixedCourses.has(code) && fixedCourses.get(code) > currentSemIndex) continue;
                
                // [FIX] Si está fijado a ESTE semestre pero no cupó por créditos, no intentar de nuevo
                // PERO si es un retake en semestre futuro, sí lo consideramos
                if (fixedCourses.has(code) && fixedCourses.get(code) === currentSemIndex && !isReprobadoRetake) continue;
                
                // Si estaba fijado a un semestre PASADO (missed), lo tratamos como elegible normal.

                if (prereqsSatisfied(code)) {
                    const asignatura = mallaByCode.get(code);
                    const score = calcularPrioridad(asignatura, dependenciasInversas, memoProfundidad);
                    eligible.push({ ...asignatura, score });
                }
            }

            // Ordenar por prioridad
            eligible.sort((a, b) => b.score - a.score);

            for (const course of eligible) {
                if (!remaining.has(course.codigo)) continue;
                // [FIX] Doble verificación para evitar duplicados en el mismo semestre
                // Pero permitir retakes en semestres futuros
                const isReprobadoRetake = reprobados.has(course.codigo) && currentSemIndex > 0;
                if (scheduled.has(course.codigo) && !isReprobadoRetake) continue;
                
                const c = course.creditos || 0;
                
                if (semester.credits + c <= currentMaxCredits) {
                    // [FIX] Marcar como retake si ya existe una instancia previa reprobada
                    const isRetake = reprobados.has(course.codigo);
                    
                    semester.courses.push({ ...course, prereqSatisfied: true, isRetake: isRetake });
                    semester.credits += c;
                    scheduled.add(course.codigo);
                    remaining.delete(course.codigo);
                }
            }
        }

        // Al finalizar el semestre, asumimos que todo lo programado se aprueba
        // y pasa a formar parte de los prerequisitos cumplidos para el SIGUIENTE semestre.
        // [FIX] Solo agregamos a projectedPassed si NO es un reprobado visual.
        semester.courses.forEach(c => {
             const lastStatus = (avance || []).filter(r => r.course === c.codigo).pop()?.status;
             // Si es reprobado Y está fijo en este semestre (es decir, es la instancia fallida), no cuenta como aprobado.
             // Si fue programado automáticamente (eligible), asumimos que se aprobará (futuro).
             const isFixedFail = c.fixed && lastStatus === 'REPROBADO';
             
             if (!isFixedFail) {
                 projectedPassed.add(c.codigo);
             }
        });

        // Si no pudimos meter nada y no hay forzados, y quedan cosas por programar...
        // Verificar si hay deadlock o si todo está forzado a futuro
        // [FIX] Ahora que permitimos llenar Semestre 1, el deadlock check aplica siempre.
        if (semester.courses.length === 0 && remaining.size > 0) {
            // Chequear si quedan cursos que NO están forzados a futuro
            const nonFixedRemaining = [...remaining].filter(c => !fixedCourses.has(c) || fixedCourses.get(c) <= currentSemIndex);
            
            if (nonFixedRemaining.length === 0) {
                // Todo lo que queda está forzado para el futuro. Avanzamos semestre vacío.
            } else {
                // Deadlock o falta de espacio
                 warnings.push('Posible bloqueo o falta de espacio en semestre ' + (currentSemIndex + 1));
                 // Forzamos uno para avanzar
                 const forced = eligible[0];
                 if (forced) {
                    semester.courses.push({ ...forced, prereqSatisfied: true });
                    semester.credits += forced.creditos;
                    scheduled.add(forced.codigo);
                    remaining.delete(forced.codigo);
                    projectedPassed.add(forced.codigo);
                 }
            }
        }

        semesters.push(semester);
        currentSemIndex++;
    }

    return { 
        semesters, 
        warnings, 
        totalSemesters: semesters.length,
        studentStatus: enAlerta ? 'ALERTA' : 'REGULAR',
        maxCreditsAllowed: maxCredits,
        estimatedGraduation: calcularFechaEgreso(semesters.filter(s => s.courses.length > 0).length)
    };
}

/**
 * Simula la reprobación de asignaturas y re-calcula la proyección.
 * [CORRECCIÓN PARA TESTS]: Implementación real de la lógica de re-planificación.
 */
export function simulateFailures(projection, failedCodes, options = {}) {
    const maxCredits = options.maxCreditsPerSemester || projection.maxCreditsAllowed || 30;
    // Clonar para no mutar el original
    const newProjection = JSON.parse(JSON.stringify(projection));
    
    for (const code of failedCodes) {
        let removedCourse = null;
        let removedFromIndex = -1;

        // 1. Quitar del semestre donde estaba
        for (let i = 0; i < newProjection.semesters.length; i++) {
            const sem = newProjection.semesters[i];
            const idx = sem.courses.findIndex(c => c.codigo === code);
            if (idx !== -1) {
                removedCourse = sem.courses.splice(idx, 1)[0];
                sem.credits -= removedCourse.creditos;
                removedFromIndex = i;
                break;
            }
        }

        // 2. Reinsertar en un semestre futuro
        if (removedCourse) {
            let inserted = false;
            // Buscar cupo desde el siguiente semestre en adelante
            for (let i = removedFromIndex + 1; i < newProjection.semesters.length; i++) {
                const sem = newProjection.semesters[i];
                if (sem.credits + removedCourse.creditos <= maxCredits) {
                    sem.courses.push(removedCourse);
                    sem.credits += removedCourse.creditos;
                    inserted = true;
                    break;
                }
            }
            // Si no cupo en ninguno existente, crear uno nuevo al final
            if (!inserted) {
                newProjection.semesters.push({
                    courses: [removedCourse],
                    credits: removedCourse.creditos
                });
            }
        }
    }
    return newProjection;
}

/* ==========================================
   SECCIÓN 2: INTERFAZ DE USUARIO (RENDER)
   ========================================== */

export function renderProjection(container, projection, options = {}) {
    if (!container) return;
    container.innerHTML = '';

    const maxCredits = projection.maxCreditsAllowed || options.maxCreditsPerSemester || 30;
    const rut = options.rut || 'anon';
    const codigo = options.codigo || 'unknown';
    const onSimulationChange = options.onSimulationChange || (() => {});
    const completedCourses = options.completedCourses || new Set(); // [FIX]
    const fixedCourses = options.fixedCourses || new Map();         // [FIX]

    // 1. Panel de Estado
    renderStatusPanel(container, projection);

    // 2. Toolbar (Con gestión de escenarios)
    renderToolbar(container, projection, rut, codigo, onSimulationChange, options);

    // 3. Grid Horizontal
    const gridContainer = document.createElement('div');
    gridContainer.className = "flex gap-4 overflow-x-auto pb-4 pt-2 snap-x min-h-[300px]";
    container.appendChild(gridContainer);

    const courseMap = new Map();
    projection.semesters.forEach(s => s.courses.forEach(c => courseMap.set(c.codigo, c)));

    projection.semesters.forEach((sem, idx) => {
        const col = document.createElement('div');
        col.className = "malla-nivel min-w-[240px] flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-300 shadow-sm snap-start transition-colors duration-200";
        col.dataset.semIndex = idx;

        // Semestre Header
        const isOverloaded = sem.credits > maxCredits;
        col.innerHTML = `
            <div class="font-bold text-center border-b pb-2 mb-1 text-gray-700 flex justify-between items-center">
                <span>Semestre ${idx + 1}</span>
                <span class="text-xs px-2 py-1 rounded-full ${isOverloaded ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-600'}">
                    ${sem.credits}/${maxCredits} cr
                </span>
            </div>
            <div class="semester-drop-zone flex-1 flex flex-col gap-2"></div>
        `;

        const dropZone = col.querySelector('.semester-drop-zone');

        // --- Drag & Drop Events ---
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggedCode = window.__draggingCourse;
            if (!draggedCode) return;

            const canDrop = validarMovimiento(draggedCode, idx, projection, courseMap, completedCourses); // [FIX]
            if (canDrop) {
                col.classList.add('drop-valid');
                col.classList.remove('drop-invalid');
                e.dataTransfer.dropEffect = "move";
            } else {
                col.classList.add('drop-invalid');
                col.classList.remove('drop-valid');
                e.dataTransfer.dropEffect = "none";
            }
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('drop-valid', 'drop-invalid');
        });

        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('drop-valid', 'drop-invalid');
            const code = e.dataTransfer.getData('text/plain');
            
            if (validarMovimiento(code, idx, projection, courseMap, completedCourses)) { // [FIX]
                moverAsignatura(code, idx, projection);
                renderProjection(container, projection, options);
                onSimulationChange(projection);
            } else {
                alert("Movimiento inválido: Faltan prerrequisitos o excede créditos.");
            }
            window.__draggingCourse = null;
        });

        // Renderizar Cursos
        sem.courses.forEach(course => {
            const card = document.createElement('div');
            card.className = "asignatura-card bg-blue-50 border border-blue-200 p-3 rounded cursor-grab shadow-sm hover:shadow-md select-none transition-colors";
            card.draggable = true;
            
            // Feedback visual del estado del ramo
            let statusIcon = '';
            let statusIndicatorColor = 'bg-blue-400'; // Default dot color

            // Determinar estado visual usando el mapa de estados si existe
            if (options.courseStatusMap && options.courseStatusMap.has(course.codigo)) {
                const status = options.courseStatusMap.get(course.codigo);
                
                if (status === 'APROBADO') {
                    card.classList.remove('bg-blue-50', 'border-blue-200');
                    card.classList.add('bg-green-100', 'border-green-300');
                    statusIcon = '✅ ';
                    statusIndicatorColor = 'bg-green-500';
                } else if (status === 'REPROBADO') {
                    // [FIX] Lógica visual para Reprobados vs Retakes
                    // Es ROJO solo si es la instancia específica que se marcó como reprobada (está fija en este semestre).
                    // Si aparece en otro semestre (proyectado automáticamente), es un intento futuro (AZUL).
                    const isFixedHere = options.fixedCourses && options.fixedCourses.get(course.codigo) === idx;
                    
                    if (isFixedHere) {
                        card.classList.remove('bg-blue-50', 'border-blue-200');
                        card.classList.add('bg-red-100', 'border-red-300');
                        statusIcon = '❌ ';
                        statusIndicatorColor = 'bg-red-500';
                    }
                    // Si no está fijo aquí, es un retake futuro -> Se mantiene Azul (Default)
                } else if (status === 'CURSANDO') {
                    card.classList.remove('bg-blue-50', 'border-blue-200');
                    card.classList.add('bg-indigo-100', 'border-indigo-300', 'ring-2', 'ring-indigo-400');
                    statusIcon = '✏️ ';
                    statusIndicatorColor = 'bg-indigo-600';
                }
            } else if (options.completedCourses && options.completedCourses.has(course.codigo)) {
                // Fallback para compatibilidad
                card.classList.remove('bg-blue-50', 'border-blue-200');
                card.classList.add('bg-green-100', 'border-green-300');
                statusIcon = '✅ ';
                statusIndicatorColor = 'bg-green-500';
            }
            
            card.innerHTML = `
                <div class="font-bold text-sm text-gray-800 truncate" title="${course.asignatura}">${statusIcon}${course.asignatura}</div>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-gray-500 font-mono">${course.codigo}</span>
                    <span class="text-xs bg-white px-1 rounded border border-gray-200">${course.creditos} cr</span>
                </div>
                <div class="absolute top-1 right-1 w-2 h-2 rounded-full ${statusIndicatorColor}" title="Click para cambiar estado"></div>
            `;

            // [NUEVO] Click para cambiar estado
            card.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar conflictos
                if (options.onCourseStatusChange) {
                    options.onCourseStatusChange(course.codigo);
                }
            });

            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', course.codigo);
                e.dataTransfer.effectAllowed = "move";
                window.__draggingCourse = course.codigo;
                setTimeout(() => card.classList.add('opacity-50'), 0);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('opacity-50');
                window.__draggingCourse = null;
                container.querySelectorAll('.malla-nivel').forEach(c => c.classList.remove('drop-valid', 'drop-invalid'));
            });

            dropZone.appendChild(card);
        });

        gridContainer.appendChild(col);
    });
}

// --- Componentes UI Auxiliares ---

function renderStatusPanel(container, projection) {
    const isAlert = projection.studentStatus === 'ALERTA';
    const panel = document.createElement('div');
    // [FIX] Agregar clase 'status-panel' para poder identificarlo y actualizarlo dinámicamente
    panel.className = `status-panel mb-4 p-4 rounded-lg border-l-4 shadow-sm flex flex-wrap justify-between items-center ${
        isAlert ? 'bg-red-50 border-red-500 text-red-900' : 'bg-green-50 border-green-500 text-green-900'
    }`;

    panel.innerHTML = `
        <div>
            <h3 class="font-bold text-lg flex items-center gap-2">
                ${isAlert ? '🚫 ALERTA ACADÉMICA' : '✅ Estado Académico Regular'}
            </h3>
            <p class="text-sm opacity-90">
                Carga máxima: <strong>${projection.maxCreditsAllowed} créditos</strong>.
            </p>
        </div>
        <div class="text-right mt-2 sm:mt-0">
            <div class="text-xs uppercase tracking-wide opacity-70">Egreso Estimado</div>
            <div class="text-2xl font-bold">${projection.estimatedGraduation || '--'}</div>
        </div>
    `;
    container.appendChild(panel);
}

function renderToolbar(container, projection, rut, codigo, onSimChange, options) {
    const toolbar = document.createElement('div');
    toolbar.className = "flex flex-wrap gap-2 mb-4 bg-gray-100 p-2 rounded-md border border-gray-200";

    const btnSimulate = createButton('Simular Reprobación', 'bg-orange-500 text-white hover:bg-orange-600', () => {
        const input = prompt("Ingresa código a reprobar (ej: PROG100):");
        if(input) {
            const newProj = simulateFailures(projection, [input], options);
            renderProjection(container, newProj, options);
            onSimChange(newProj);
        }
    });

    const btnSave = createButton('Guardar Escenario', 'bg-blue-600 text-white hover:bg-blue-700', () => {
        const name = prompt("Nombre del escenario:", `Plan ${new Date().toLocaleDateString()}`);
        if (name) guardarProyeccionEnBackend(projection, rut, codigo, name);
    });

    // [MEJORA] Botón Cargar con gestión completa (Listar y Borrar)
    const btnLoad = createButton('Gestionar Escenarios', 'bg-gray-600 text-white hover:bg-gray-700', async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}/proyeccion?codigo=${codigo}`, { credentials: 'include' });
            if (resp.ok) {
                const data = await resp.json();
                const lista = data.proyecciones;
                
                if (!lista || lista.length === 0) {
                    alert("No hay escenarios guardados.");
                    return;
                }

                // Crear lista para el prompt
                let mensaje = "Escribe el ID del escenario para CARGAR (o escribe 'BORRAR [ID]' para eliminar):\n\n";
                lista.forEach((p) => {
                    // Mostramos ID corto para facilitar lectura
                    mensaje += `${p.id} - ${p.name} (${new Date(p.createdAt).toLocaleDateString()})\n`;
                });

                const seleccion = prompt(mensaje);
                if (!seleccion) return;

                if (seleccion.startsWith('BORRAR')) {
                    // Lógica de eliminación
                    const idBorrar = seleccion.split(' ')[1];
                    if(idBorrar) {
                        if(confirm(`¿Estás seguro de eliminar la proyección ${idBorrar}?`)) {
                            await eliminarProyeccionBackend(idBorrar);
                        }
                    }
                } else {
                    // Lógica de carga
                    const encontrado = lista.find(p => p.id === seleccion.trim());
                    if (encontrado) {
                        renderProjection(container, encontrado.projection, options);
                        onSimChange(encontrado.projection);
                    } else {
                        alert("ID no encontrado");
                    }
                }
            }
        } catch (e) { console.error(e); alert("Error al cargar proyecciones"); }
    });
    
    const btnRecalculate = createButton('Recalcular Ruta', 'bg-green-600 text-white hover:bg-green-700', () => {
        if (options.onRecalculate) {
            options.onRecalculate();
        }
    });
    
    const btnReset = createButton('Resetear', 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50', () => {
        if(options.onReset) {
            const fresh = options.onReset();
            if (fresh) {
                renderProjection(container, fresh, options);
                onSimChange(fresh);
            }
        }
    });

    toolbar.appendChild(btnRecalculate);
    toolbar.appendChild(btnSave);
    toolbar.appendChild(btnLoad);
    toolbar.appendChild(btnReset);
    container.appendChild(toolbar);
}

function createButton(text, classes, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `px-3 py-1.5 rounded text-sm font-medium transition-colors ${classes}`;
    btn.onclick = onClick;
    return btn;
}

// --- Lógica de Validación y Movimiento ---

function validarMovimiento(courseCode, targetSemIdx, projection, courseMap, completedCourses = new Set()) {
    const course = courseMap.get(courseCode);
    if (!course) return false;

    // 1. Validar Prerrequisitos
    const prereqs = course.prereqList || [];
    for (const pre of prereqs) {
        let foundAt = -Infinity; // Asumimos aprobado históricamente (fuera de proyección)
        
        // Buscar si el prerequisito está en la proyección futura
        projection.semesters.forEach((s, idx) => {
            if (s.courses.find(c => c.codigo === pre)) foundAt = idx;
        });

        // Si NO está en la proyección, debe estar en aprobados históricos
        if (foundAt === -Infinity) {
            if (!completedCourses.has(pre)) {
                // No está en proyección Y no está aprobado -> No se puede tomar
                return false;
            }
        }

        // El prerequisito debe estar en un semestre estrictamente anterior
        if (foundAt >= targetSemIdx) return false; 
    }

    // 2. Validar Créditos
    const targetSem = projection.semesters[targetSemIdx];
    const maxCredits = projection.maxCreditsAllowed || 30;
    
    // Calcular créditos actuales del semestre destino
    let currentCredits = targetSem.credits;
    
    // Si el curso ya está en este semestre, no sumamos (es un movimiento interno o nulo)
    const alreadyInSem = targetSem.courses.find(c => c.codigo === courseCode);
    if (alreadyInSem) return true;

    if (currentCredits + (course.creditos || 0) > maxCredits) {
        return false;
    }

    return true;
}

function moverAsignatura(code, targetSemIdx, projection) {
    let courseObj = null;
    // Quitar de origen
    for (const sem of projection.semesters) {
        const idx = sem.courses.findIndex(c => c.codigo === code);
        if (idx !== -1) {
            courseObj = sem.courses.splice(idx, 1)[0];
            sem.credits -= courseObj.creditos;
            break;
        }
    }
    // Agregar a destino
    if (courseObj) {
        projection.semesters[targetSemIdx].courses.push(courseObj);
        projection.semesters[targetSemIdx].credits += courseObj.creditos;
    }
}

// --- API Helpers ---

async function guardarProyeccionEnBackend(proj, rut, codigo, name) {
    try {
        const body = { userId: rut, codigoCarrera: codigo, name, projection: proj };
        const resp = await fetch(`${API_BASE_URL}/proyeccion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include'
        });
        if (resp.ok) alert("Proyección guardada.");
        else alert("Error al guardar.");
    } catch (e) { console.error(e); alert("Error de conexión"); }
}

async function eliminarProyeccionBackend(id) {
    try {
        const resp = await fetch(`${API_BASE_URL}/proyeccion/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (resp.ok) alert("Proyección eliminada.");
        else {
            const err = await resp.json();
            alert("Error al eliminar: " + (err.error || "Desconocido"));
        }
    } catch (e) { console.error(e); alert("Error de conexión"); }
}