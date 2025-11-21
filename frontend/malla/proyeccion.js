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

    // Ordenar cronológicamente
    const historialOrdenado = [...avance].sort((a, b) => (a.period || '').localeCompare(b.period || ''));

    for (const registro of historialOrdenado) {
        const codigo = registro.course;
        const periodo = registro.period;
        const estado = registro.status;

        if (!intentosPorCurso[codigo]) intentosPorCurso[codigo] = 0;
        
        // Solo contamos intentos si el ramo fue inscrito (asumimos que aparece en el historial)
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
 * Calcula un "Puntaje de Prioridad" para una asignatura.
 */
function calcularPrioridad(asignatura, grafoDependencias) {
    let puntaje = 0;
    // Prioridad 1: Nivel bajo (urgente). Invertimos nivel: 1->200 pts, 10->110 pts
    puntaje += (20 - (asignatura.nivel || 10)) * 10; 
    // Prioridad 2: Desbloqueo (cuántos ramos dependen de este)
    const desbloquea = grafoDependencias.get(asignatura.codigo) || new Set();
    puntaje += desbloquea.size * 5;
    // Prioridad 3: Créditos (para llenar huecos pequeños)
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

    const remaining = new Set([...mallaByCode.keys()].filter(code => !completed.has(code)));
    const semesters = [];
    const scheduled = new Set();

    function prereqsSatisfied(code) {
        const pList = mallaByCode.get(code).prereqList || [];
        for (const p of pList) {
            if (completed.has(p)) continue;
            if (scheduled.has(p)) continue;
            return false;
        }
        return true;
    }

    // 4. Loop de Programación
    while (remaining.size > 0) {
        let eligible = [];
        for (const code of remaining) {
            if (prereqsSatisfied(code)) {
                const asignatura = mallaByCode.get(code);
                const score = calcularPrioridad(asignatura, dependenciasInversas);
                eligible.push({ ...asignatura, score });
            }
        }

        if (eligible.length === 0) {
            warnings.push('No se puede completar la proyección (posible ciclo o datos faltantes).');
            break;
        }

        // Ordenar por prioridad
        eligible.sort((a, b) => b.score - a.score);

        const semester = { courses: [], credits: 0 };
        
        for (const course of eligible) {
            if (!remaining.has(course.codigo)) continue;
            const c = course.creditos || 0;
            
            if (semester.credits + c <= maxCredits) {
                semester.courses.push({ ...course, prereqSatisfied: true });
                semester.credits += c;
                scheduled.add(course.codigo);
            }
        }

        // Forzar al menos un curso si ninguno cabe (para no loop infinito)
        if (semester.courses.length === 0 && eligible.length > 0) {
            const forced = eligible[0];
            semester.courses.push({ ...forced, prereqSatisfied: true });
            semester.credits = forced.creditos;
            scheduled.add(forced.codigo);
            warnings.push(`Asignatura ${forced.codigo} excede límite, forzada.`);
        }

        for (const c of semester.courses) remaining.delete(c.codigo);
        semesters.push(semester);
    }

    return { 
        semesters, 
        warnings, 
        totalSemesters: semesters.length,
        studentStatus: enAlerta ? 'ALERTA' : 'REGULAR',
        maxCreditsAllowed: maxCredits,
        estimatedGraduation: calcularFechaEgreso(semesters.length)
    };
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

    // 1. Panel de Estado
    renderStatusPanel(container, projection);

    // 2. Toolbar
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

            const canDrop = validarMovimiento(draggedCode, idx, projection, courseMap);
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
            
            if (validarMovimiento(code, idx, projection, courseMap)) {
                moverAsignatura(code, idx, projection);
                renderProjection(container, projection, options);
                onSimulationChange(projection);
            } else {
                alert("Movimiento inválido: Faltan prerrequisitos o rompe la cadena.");
            }
            window.__draggingCourse = null;
        });

        // Renderizar Cursos
        sem.courses.forEach(course => {
            const card = document.createElement('div');
            card.className = "asignatura-card bg-blue-50 border border-blue-200 p-3 rounded cursor-grab shadow-sm hover:shadow-md select-none";
            card.draggable = true;
            card.innerHTML = `
                <div class="font-bold text-sm text-gray-800 truncate" title="${course.asignatura}">${course.asignatura}</div>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-gray-500 font-mono">${course.codigo}</span>
                    <span class="text-xs bg-white px-1 rounded border border-gray-200">${course.creditos} cr</span>
                </div>
            `;

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
    panel.className = `mb-4 p-4 rounded-lg border-l-4 shadow-sm flex flex-wrap justify-between items-center ${
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
        if(input) alert(`Simulando reprobación de ${input} (placeholder).`);
    });

    const btnSave = createButton('Guardar Escenario', 'bg-blue-600 text-white hover:bg-blue-700', () => {
        const name = prompt("Nombre del escenario:", `Plan ${new Date().toLocaleDateString()}`);
        if (name) guardarProyeccionEnBackend(projection, rut, codigo, name);
    });

    const btnLoad = createButton('Cargar Escenario', 'bg-gray-600 text-white hover:bg-gray-700', () => {
        cargarProyeccionDeBackend(rut, codigo, (loaded) => {
            renderProjection(container, loaded, options);
            onSimChange(loaded);
        });
    });
    
    const btnReset = createButton('Resetear', 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50', () => {
        if(options.onReset) {
            const fresh = options.onReset();
            renderProjection(container, fresh, options);
            onSimChange(fresh);
        }
    });

    toolbar.appendChild(btnSimulate);
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

function validarMovimiento(courseCode, targetSemIdx, projection, courseMap) {
    const course = courseMap.get(courseCode);
    if (!course) return false;

    const prereqs = course.prereqList || [];
    for (const pre of prereqs) {
        let foundAt = -Infinity; // Asumimos aprobado históricamente (fuera de proyección)
        
        // Buscar si el prerequisito está en la proyección futura
        projection.semesters.forEach((s, idx) => {
            if (s.courses.find(c => c.codigo === pre)) foundAt = idx;
        });

        // El prerequisito debe estar en un semestre estrictamente anterior
        if (foundAt >= targetSemIdx) return false; 
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

async function cargarProyeccionDeBackend(rut, codigo, onSuccess) {
    try {
        const resp = await fetch(`${API_BASE_URL}/proyeccion?codigo=${codigo}`, { credentials: 'include' });
        if (resp.ok) {
            const data = await resp.json();
            if (data.proyecciones && data.proyecciones.length > 0) {
                // Cargar la última
                const latest = data.proyecciones[data.proyecciones.length - 1];
                onSuccess(latest.projection);
                alert(`Cargada proyección: ${latest.name}`);
            } else {
                alert("No hay proyecciones guardadas.");
            }
        }
    } catch (e) { console.error(e); }
}

// Función stub para tests
export function simulateFailures(projection) { return projection; }