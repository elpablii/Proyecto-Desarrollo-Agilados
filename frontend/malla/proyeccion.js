/**
 * Módulo de proyección de malla curricular (MVP)
 * Exports:
 *  - computeProjection(mallaArray, avanceArray, options)
 *  - renderProjection(containerElement, projection, options)
 */

import { API_BASE_URL } from '../config.js';

/**
 * Compute a semester-by-semester projection given malla and avance
 * options: { maxCreditsPerSemester: number, includeInProgressAsCompleted: bool }
 */
export function computeProjection(malla, avance, options = {}) {
    const maxCredits = options.maxCreditsPerSemester || 30;
    const includeInProgress = !!options.includeInProgressAsCompleted;

    if (!Array.isArray(malla)) return { semesters: [], warnings: ['Malla inválida o vacía'] };

    // Build maps
    const mallaByCode = new Map();
    for (const a of malla) {
        mallaByCode.set(a.codigo, { ...a, prereqList: (a.prereq || '').split(',').map(s => s.trim()).filter(Boolean) });
    }

    // Completed set from avance
    const completed = new Set(
        (avance || [])
            .filter(r => r.status === 'APROBADO')
            .map(r => r.course)
    );
    if (includeInProgress) {
        (avance || []).filter(r => r.status === 'CURSANDO' || r.status === 'INSCRITO').forEach(r => completed.add(r.course));
    }

    // Remaining courses = those in malla not completed
    const remaining = new Set([...mallaByCode.keys()].filter(code => !completed.has(code)));

    // Build indegree graph for topological detection (prereq -> course)
    const indegree = new Map();
    const adj = new Map();
    for (const code of mallaByCode.keys()) {
        indegree.set(code, 0);
        adj.set(code, new Set());
    }
    for (const [code, course] of mallaByCode.entries()) {
        for (const pre of course.prereqList) {
            if (!mallaByCode.has(pre)) continue; // external prereq, ignore for indegree
            adj.get(pre).add(code);
            indegree.set(code, (indegree.get(code) || 0) + 1);
        }
    }

    // Detect cycles with Kahn's algorithm (only considering nodes in malla)
    const q = [];
    for (const [c, d] of indegree.entries()) if (d === 0) q.push(c);
    const topo = [];
    while (q.length) {
        const n = q.shift();
        topo.push(n);
        for (const nb of adj.get(n) || []) {
            indegree.set(nb, indegree.get(nb) - 1);
            if (indegree.get(nb) === 0) q.push(nb);
        }
    }
    if (topo.length !== mallaByCode.size) {
        return { semesters: [], warnings: ['Ciclo detectado en prerrequisitos o datos incompletos'], error: true };
    }

    // Now greedy assign by semesters
    const semesters = [];
    const scheduled = new Set();
    const warnings = [];

    // Helper to check if prereqs satisfied (either completed or scheduled earlier)
    function prereqsSatisfied(code) {
        const pList = mallaByCode.get(code).prereqList || [];
        for (const p of pList) {
            if (completed.has(p)) continue;
            if (!scheduled.has(p)) return false;
        }
        return true;
    }

    // We'll iterate until remaining empty
    while (remaining.size > 0) {
        // Find eligible courses: in remaining and prereqs satisfied
        const eligible = [];
        for (const code of remaining) {
            if (prereqsSatisfied(code)) eligible.push(mallaByCode.get(code));
        }

        if (eligible.length === 0) {
            warnings.push('No hay cursos elegibles para programar — faltan prerrequisitos o datos incompletos');
            break;
        }

        // Sort eligible: nivel asc, creditos desc, then codigo
        eligible.sort((a, b) => (a.nivel || 0) - (b.nivel || 0) || (b.creditos || 0) - (a.creditos || 0) || (a.codigo || '').localeCompare(b.codigo || ''));

        // Fill semester
        const semester = { courses: [], credits: 0 };
        for (const course of eligible) {
            if (!remaining.has(course.codigo)) continue; // may have been scheduled
            const c = course.creditos || 0;
            if (semester.credits + c <= maxCredits) {
                semester.courses.push({ ...course, prereqSatisfied: true });
                semester.credits += c;
                scheduled.add(course.codigo);
            }
        }

        // Edge case: nothing fit because first eligible has > maxCredits
        if (semester.courses.length === 0) {
            // pick the smallest eligible (or the first) and place alone
            const first = eligible[0];
            semester.courses.push({ ...first, prereqSatisfied: true });
            semester.credits = first.creditos || 0;
            scheduled.add(first.codigo);
            warnings.push(`Asignatura ${first.codigo} con ${first.creditos} créditos excede el máximo por semestre (${maxCredits}), asignada sola`);
        }

        // Remove scheduled from remaining
        for (const c of semester.courses) remaining.delete(c.codigo);

        semesters.push(semester);
    }

    return { semesters, warnings, totalSemesters: semesters.length };
}

/**
 * Render projection into a container. Adds simple drag & drop and save/restore to localStorage.
 */
export function renderProjection(container, projection, options = {}) {
    if (!container) return;
    container.innerHTML = '';

    const maxCredits = options.maxCreditsPerSemester || 30;
    const rut = options.rut || 'anon';
    const codigo = options.codigo || 'unknown';
    const storageKey = `proyeccion_${rut}_${codigo}`;

    // Controls: save / restore / reset
    const controls = document.createElement('div');
    controls.className = 'mb-4 flex gap-2';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'bg-green-500 text-white px-3 py-1 rounded';
    saveBtn.textContent = 'Guardar escenario';
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'bg-blue-500 text-white px-3 py-1 rounded';
    restoreBtn.textContent = 'Restaurar guardado';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'bg-gray-300 text-black px-3 py-1 rounded';
    resetBtn.textContent = 'Restablecer default';
    controls.appendChild(saveBtn);
    controls.appendChild(restoreBtn);
    controls.appendChild(resetBtn);
    // selection controls for simulating failures
    const selectToggleBtn = document.createElement('button');
    selectToggleBtn.className = 'bg-yellow-400 text-black px-3 py-1 rounded';
    selectToggleBtn.textContent = 'Marcar para reprobar';
    const clearSelectionBtn = document.createElement('button');
    clearSelectionBtn.className = 'bg-gray-200 text-black px-3 py-1 rounded';
    clearSelectionBtn.textContent = 'Limpiar selección';
    const simulateBtn = document.createElement('button');
    simulateBtn.className = 'bg-red-500 text-white px-3 py-1 rounded';
    simulateBtn.textContent = 'Simular reprobar ramos';
    // selection counter
    const selectionCounter = document.createElement('span');
    selectionCounter.className = 'ml-2 text-sm text-gray-700';
    selectionCounter.textContent = 'Seleccionados: 0';
    controls.appendChild(selectToggleBtn);
    controls.appendChild(clearSelectionBtn);
    controls.appendChild(simulateBtn);
    controls.appendChild(selectionCounter);
    container.appendChild(controls);

    const grid = document.createElement('div');
    grid.style.display = 'flex';
    grid.style.gap = '12px';
    grid.style.overflowX = 'auto';
    container.appendChild(grid);

    // selection mode state
    let selectionMode = false;
    const selectedSet = new Set();

    function updateCardSelectionVisual(card, isSelected) {
        if (isSelected) {
            card.classList.add('border-4');
            card.style.borderColor = '#f43f5e'; // red-500
            card.style.boxShadow = '0 6px 10px rgba(244,63,94,0.15)';
        } else {
            card.classList.remove('border-4');
            card.style.borderColor = '';
            card.style.boxShadow = '';
        }
    }

    function createCard(course) {
        const card = document.createElement('div');
        card.className = 'asignatura-card asignatura-pendiente';
        card.draggable = !selectionMode;
        card.dataset.code = course.codigo;
        card.innerHTML = `
            <div class="asignatura-nombre">${course.asignatura}</div>
            <div class="asignatura-codigo">${course.codigo}</div>
            <div class="asignatura-creditos">Créditos: ${course.creditos}</div>
        `;
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', course.codigo);
        });

        // click toggles selection if selectionMode is active
        card.addEventListener('click', (e) => {
            if (!selectionMode) return;
            const code = course.codigo;
            if (selectedSet.has(code)) {
                selectedSet.delete(code);
                updateCardSelectionVisual(card, false);
            } else {
                selectedSet.add(code);
                updateCardSelectionVisual(card, true);
            }
            // update counter
            selectionCounter.textContent = `Seleccionados: ${selectedSet.size}`;
            e.stopPropagation();
        });
        // apply initial visual selection state
        if (selectedSet.has(course.codigo)) updateCardSelectionVisual(card, true);
        return card;
    }

    function updateDnDState() {
        // update draggable attribute of existing cards
        const cards = container.querySelectorAll('.asignatura-card');
        cards.forEach(c => c.draggable = !selectionMode);
        // reset counter when leaving selection mode
        if (!selectionMode) selectionCounter.textContent = `Seleccionados: ${selectedSet.size}`;
    }

    // Build helper map of all courses for prereq checks
    const projectionAllByCode = {};
    if (projection && projection.semesters) {
        for (const s of projection.semesters) {
            for (const c of s.courses) projectionAllByCode[c.codigo] = c;
        }
    }

    // helper to check prereqs for a target semester index
    function canPlaceInSemester(courseCode, targetIdx, completedSet) {
        const course = projectionAllByCode[courseCode];
        if (!course) return false;
        const pList = course.prereqList || [];
        for (const p of pList) {
            if (completedSet && completedSet.has && completedSet.has(p)) continue;
            // check if p is scheduled in an earlier semester (< targetIdx)
            let foundEarlier = false;
            for (let si = 0; si < targetIdx; si++) {
                const s = projection.semesters[si];
                if (!s) continue;
                if (s.courses.find(c => c.codigo === p)) { foundEarlier = true; break; }
            }
            if (!foundEarlier) return false;
        }
        return true;
    }

    function renderSemesters(semesters) {
        grid.innerHTML = '';
        semesters.forEach((sem, idx) => {
            const col = document.createElement('div');
            col.className = 'malla-nivel';
            col.style.minWidth = '220px';
            const header = document.createElement('div');
            header.className = 'malla-nivel-header';
            header.textContent = `Semestre ${idx + 1} — ${sem.credits} créditos`;
            col.appendChild(header);

            const list = document.createElement('div');
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.gap = '8px';
            list.dataset.semesterIndex = idx;

            list.addEventListener('dragover', (e) => e.preventDefault());
            list.addEventListener('drop', (e) => {
                e.preventDefault();
                const code = e.dataTransfer.getData('text/plain');
                if (!code) return;
                // find course in any semester
                let moved = null;
                for (const s of projection.semesters) {
                    const i = s.courses.findIndex(c => c.codigo === code);
                    if (i >= 0) {
                        moved = s.courses.splice(i, 1)[0];
                        s.credits -= moved.creditos || 0;
                        break;
                    }
                }
                if (moved) {
                    const targetIdx = parseInt(list.dataset.semesterIndex, 10);
                    // build completedSet from options if provided
                    const completedSet = new Set((options.completed || []).slice());
                    // also add courses that were originally completed (options.completed) and scheduled in earlier semesters
                    // validate prereqs before placing
                    if (!canPlaceInSemester(moved.codigo, targetIdx, completedSet)) {
                        // rollback: put it back where it was (append to first semester that doesn't already include it)
                        alert(`No se pueden mover ${moved.codigo} a Semestre ${targetIdx + 1}: prerrequisitos no satisfechos.`);
                        // return moved to its previous place: we simply re-render without removing it from original earlier state
                        // To simplify, recompute projection render (the moved was removed from its semester above), so push it back to nearest previous semester
                        // Try to put it back into the earliest semester (index 0)
                        projection.semesters[0].courses.push(moved);
                        projection.semesters[0].credits += moved.creditos || 0;
                        renderSemesters(projection.semesters);
                        return;
                    }

                    // append to target semester
                    projection.semesters[targetIdx].courses.push(moved);
                    projection.semesters[targetIdx].credits += moved.creditos || 0;
                    renderSemesters(projection.semesters);
                }
            });

            for (const course of sem.courses) {
                const card = createCard(course);
                list.appendChild(card);
            }

            col.appendChild(list);
            grid.appendChild(col);
        });
    }

    // initial render
    renderSemesters(projection.semesters);

    saveBtn.addEventListener('click', () => {
        (async () => {
            try {
                // Try to save to backend if available
                const apiUrl = options.apiBaseUrl || API_BASE_URL;
                let serverSaved = false;
                if (apiUrl) {
                    try {
                        const resp = await fetch(`${apiUrl}/proyeccion`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ codigoCarrera: codigo, name: `${rut}_${codigo}_${Date.now()}`, projection })
                        });
                        if (resp.ok) {
                            const data = await resp.json();
                            serverSaved = true;
                            console.log('Proyección guardada en servidor id=', data.id);
                            alert('Escenario guardado en servidor (id: ' + data.id + ')');
                        } else {
                            console.warn('No se pudo guardar en servidor, status=', resp.status);
                        }
                    } catch (err) {
                        console.warn('Error comunicando con backend para guardar proyección:', err);
                    }
                }

                // Always persist locally as fallback
                try {
                    localStorage.setItem(storageKey, JSON.stringify(projection));
                } catch (e) {
                    console.error('No se pudo guardar localmente:', e);
                }

                if (!serverSaved) alert('Escenario guardado localmente');
            } catch (e) {
                console.error('No se pudo guardar escenario:', e);
                alert('Error guardando escenario');
            }
        })();
    });

    restoreBtn.addEventListener('click', () => {
        (async () => {
            try {
                // Try to restore from server first
                const apiUrl = options.apiBaseUrl || API_BASE_URL;
                if (apiUrl) {
                    try {
                        const resp = await fetch(`${apiUrl}/proyeccion?codigo=${encodeURIComponent(codigo)}`, {
                            method: 'GET',
                            credentials: 'include'
                        });
                        if (resp.ok) {
                            const data = await resp.json();
                            if (data && Array.isArray(data.proyecciones) && data.proyecciones.length > 0) {
                                // pick the latest by updatedAt
                                data.proyecciones.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                                const latest = data.proyecciones[0];
                                if (latest && latest.projection && Array.isArray(latest.projection.semesters)) {
                                    projection.semesters = latest.projection.semesters;
                                    renderSemesters(projection.semesters);
                                    alert('Escenario restaurado desde servidor');
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('Error comunicando con backend al restaurar proyección:', err);
                    }
                }

                // Fallback to localStorage
                const raw = localStorage.getItem(storageKey);
                if (!raw) return alert('No hay escenario guardado');
                const obj = JSON.parse(raw);
                projection.semesters = obj.semesters || projection.semesters;
                renderSemesters(projection.semesters);
                alert('Escenario restaurado');
            } catch (e) {
                console.error('Error restaurando:', e);
                alert('Error restaurando escenario');
            }
        })();
    });

    resetBtn.addEventListener('click', () => {
        // Recompute default if callback provided
        if (typeof options.onReset === 'function') {
            const newProj = options.onReset();
            if (newProj && newProj.semesters) {
                projection.semesters = newProj.semesters;
                renderSemesters(projection.semesters);
            }
        }
    });
    // toggle selection mode
    selectToggleBtn.addEventListener('click', () => {
        selectionMode = !selectionMode;
        selectToggleBtn.textContent = selectionMode ? 'Salir modo selección' : 'Marcar para reprobar';
        // Re-render semesters to update draggable state and visuals
        renderSemesters(projection.semesters);
        updateDnDState();
    });

    clearSelectionBtn.addEventListener('click', () => {
        selectedSet.clear();
        renderSemesters(projection.semesters);
    });

    simulateBtn.addEventListener('click', () => {
        // prefer selectedSet if non-empty
        const codes = Array.from(selectedSet);
        if (codes.length === 0) {
            const input = prompt('Ingresa los códigos de las asignaturas que se reprobarán, separados por comas (ej: PROG100,ALGOR):');
            if (!input) return;
            const parsed = input.split(',').map(s => s.trim()).filter(Boolean);
            if (parsed.length === 0) return alert('No se ingresaron códigos válidos.');
            codes.push(...parsed);
        }
        const newProj = simulateFailures(projection, codes, { maxCreditsPerSemester: maxCredits });
        if (newProj) {
            projection.semesters = newProj.semesters;
            // clear selection after applying
            selectedSet.clear();
            renderSemesters(projection.semesters);
            alert('Simulación aplicada: ramos reprobados se han movido a semestres posteriores.');
        } else {
            alert('No se pudo simular reprobar los ramos especificados.');
        }
    });
}

/**
 * Simulate failing some courses and reschedule them to later semesters.
 * - projection: original projection object (will not be mutated)
 * - failedCourseCodes: array of course codes to mark as failed
 * - opts: { maxCreditsPerSemester }
 * Returns a new projection object with rescheduled courses.
 */
export function simulateFailures(projection, failedCourseCodes = [], opts = {}) {
    const maxCredits = opts.maxCreditsPerSemester || 30;
    if (!projection || !Array.isArray(projection.semesters)) return null;

    // Deep clone semesters
    const semesters = projection.semesters.map(s => ({ credits: s.credits, courses: s.courses.map(c => ({ ...c })) }));

    // Remove failed courses from their semesters and collect them to reschedule
    const toReschedule = [];
    for (const code of failedCourseCodes) {
        for (let si = 0; si < semesters.length; si++) {
            const s = semesters[si];
            const idx = s.courses.findIndex(c => c.codigo === code);
            if (idx >= 0) {
                const [removed] = s.courses.splice(idx, 1);
                s.credits = Math.max(0, s.credits - (removed.creditos || 0));
                // record original semester index so we reschedule after it
                removed.__originalSemester = si;
                toReschedule.push(removed);
                break;
            }
        }
    }

    // Greedily try to place each failed course in the next semesters after its original position
    for (const failed of toReschedule) {
        // find earliest semester index where it previously was (approximate by level)
        // We'll search from semester 0 forward and place in the first semester where prereqs are satisfied and capacity allows
        let placed = false;
    const startTarget = (typeof failed.__originalSemester === 'number') ? failed.__originalSemester + 1 : 0;
    for (let target = startTarget; target < semesters.length; target++) {
            // compute set of codes available in earlier semesters
            const earlierCodes = new Set();
            for (let si = 0; si < target; si++) {
                for (const c of semesters[si].courses) earlierCodes.add(c.codigo);
            }
            // check prereqs satisfied
            const prereqs = (failed.prereq || '').split(',').map(s => s.trim()).filter(Boolean);
            let ok = true;
            for (const p of prereqs) {
                // if prereq equals the failed code itself, it's not satisfied now
                if (!earlierCodes.has(p)) { ok = false; break; }
            }
            if (!ok) continue;
            // check capacity
            if ((semesters[target].credits || 0) + (failed.creditos || 0) <= maxCredits) {
                semesters[target].courses.push(failed);
                semesters[target].credits = (semesters[target].credits || 0) + (failed.creditos || 0);
                placed = true;
                break;
            }
        }

        // if not placed, add new semesters until it fits
        if (!placed) {
            let inserted = false;
            while (!inserted) {
                const newSem = { credits: 0, courses: [] };
                semesters.push(newSem);
                if ((newSem.credits || 0) + (failed.creditos || 0) <= maxCredits) {
                    newSem.courses.push(failed);
                    newSem.credits += failed.creditos || 0;
                    inserted = true;
                }
            }
        }
    }

    return { semesters, warnings: [`Simulación aplicada: ${toReschedule.length} ramos reprogramados`] };
}
