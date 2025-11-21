import { computeProjection } from '../malla/proyeccion.js';
import { simulateFailures } from '../malla/proyeccion.js';

describe('computeProjection', () => {
    test('proyección simple sin prerrequisitos agrupa por créditos', () => {
        const malla = [
            { codigo: 'A', asignatura: 'A', creditos: 6, nivel: 1, prereq: '' },
            { codigo: 'B', asignatura: 'B', creditos: 6, nivel: 1, prereq: '' },
            { codigo: 'C', asignatura: 'C', creditos: 6, nivel: 1, prereq: '' }
        ];
        const avance = [];
        const res = computeProjection(malla, avance, { maxCreditsPerSemester: 30 });
        expect(res.error).toBeUndefined();
        expect(res.semesters.length).toBe(1);
        expect(res.semesters[0].courses.map(c => c.codigo).sort()).toEqual(['A','B','C'].sort());
    });

    test('respeta prerrequisitos (AND simple)', () => {
        const malla = [
            { codigo: 'PROG100', asignatura: 'Intro', creditos: 8, nivel: 1, prereq: '' },
            { codigo: 'PROG200', asignatura: 'Estructuras', creditos: 8, nivel: 2, prereq: 'PROG100' }
        ];
        const avance = [];
        const res = computeProjection(malla, avance, { maxCreditsPerSemester: 30 });
        expect(res.error).toBeUndefined();
        // first semester should include PROG100, second PROG200
        expect(res.semesters.length).toBe(2);
        expect(res.semesters[0].courses.map(c => c.codigo)).toContain('PROG100');
        expect(res.semesters[1].courses.map(c => c.codigo)).toContain('PROG200');
    });

    test('detecta ciclo en prerrequisitos y retorna error', () => {
        const malla = [
            { codigo: 'A', asignatura: 'A', creditos: 6, nivel: 1, prereq: 'B' },
            { codigo: 'B', asignatura: 'B', creditos: 6, nivel: 1, prereq: 'A' }
        ];
        const avance = [];
        const res = computeProjection(malla, avance, { maxCreditsPerSemester: 30 });
        expect(res.error).toBeTruthy();
        expect(res.warnings && res.warnings.length).toBeGreaterThan(0);
    });

    test('asignatura con créditos mayores al máximo se asigna sola y genera warning', () => {
        const malla = [
            { codigo: 'G', asignatura: 'GranCurso', creditos: 40, nivel: 1, prereq: '' },
            { codigo: 'H', asignatura: 'Otro', creditos: 6, nivel: 1, prereq: '' }
        ];
        const avance = [];
        const res = computeProjection(malla, avance, { maxCreditsPerSemester: 30 });
        // Debería crear al menos 2 semestres (uno para G, otro para H)
        expect(res.semesters.length).toBeGreaterThanOrEqual(2);
        // Warning sobre curso grande
        expect(res.warnings.some(w => w.includes('excede'))).toBe(true);
    });

    test('simulateFailures reubica cursos reprobados a semestres posteriores', () => {
        const projection = {
            semesters: [
                { credits: 12, courses: [{ codigo: 'A', creditos: 6 }, { codigo: 'B', creditos: 6 }] },
                { credits: 6, courses: [{ codigo: 'C', creditos: 6 }] }
            ]
        };

        const res = simulateFailures(projection, ['A'], { maxCreditsPerSemester: 12 });
        // A should be removed from semester 0 and placed in a later semester
        const allCodes = res.semesters.flatMap(s => s.courses.map(c => c.codigo));
        expect(allCodes).toContain('A');
        // ensure A is not in semester 0 anymore
        expect(res.semesters[0].courses.map(c => c.codigo)).not.toContain('A');
    });

    test('simulateFailures crea nuevos semestres si no hay cupo', () => {
        const projection = {
            semesters: [
                { credits: 30, courses: [{ codigo: 'X', creditos: 30 }] }
            ]
        };
        const failed = { codigo: 'BIG', creditos: 20, prereq: '' };
        // place BIG in semester 0 initially
        projection.semesters[0].courses.push(failed);
        projection.semesters[0].credits += 20;

        const res = simulateFailures(projection, ['BIG'], { maxCreditsPerSemester: 30 });
        // BIG must be placed in a new semester because semester 0 is full
        const found = res.semesters.flatMap(s => s.courses.map(c => c.codigo)).filter(c => c === 'BIG');
        expect(found.length).toBe(1);
        expect(res.semesters.length).toBeGreaterThan(1);
    });
});

import { detectarAlertaAcademica } from '../malla/proyeccion.js'; // Asegúrate de importar esta función arriba

describe('Reglas de Negocio: Alerta Académica', () => {

    test('detecta alerta por reprobar una asignatura 3 veces (Regla 2)', () => {
        const historial = [
            { course: 'MAT101', status: 'REPROBADO', period: '2022-1' },
            { course: 'MAT101', status: 'REPROBADO', period: '2022-2' },
            { course: 'MAT101', status: 'REPROBADO', period: '2023-1' } // 3er intento
        ];
        const esAlerta = detectarAlertaAcademica(historial);
        expect(esAlerta).toBe(true);
    });

    test('detecta alerta por reprobar 2 asignaturas en 2da oportunidad el mismo semestre (Regla 1)', () => {
        const historial = [
            // Intento 1 (anterior)
            { course: 'MAT101', status: 'REPROBADO', period: '2022-1' },
            { course: 'FIS101', status: 'REPROBADO', period: '2022-1' },
            
            // Intento 2 (mismo periodo 2022-2)
            { course: 'MAT101', status: 'REPROBADO', period: '2022-2' },
            { course: 'FIS101', status: 'REPROBADO', period: '2022-2' }
        ];
        const esAlerta = detectarAlertaAcademica(historial);
        expect(esAlerta).toBe(true);
    });

    test('NO detecta alerta si las reprobaciones están dispersas', () => {
        const historial = [
            { course: 'MAT101', status: 'REPROBADO', period: '2022-1' }, // 1ra vez
            { course: 'FIS101', status: 'REPROBADO', period: '2022-2' }  // 1ra vez
        ];
        expect(detectarAlertaAcademica(historial)).toBe(false);
    });

    test('restringe automáticamente a 15 créditos si hay alerta', () => {
        // Usuario en alerta
        const historialAlerta = [
            { course: 'X', status: 'REPROBADO', period: '1' },
            { course: 'X', status: 'REPROBADO', period: '2' },
            { course: 'X', status: 'REPROBADO', period: '3' }
        ];
        
        // Malla con 2 ramos de 10 créditos cada uno (Total 20)
        const mallaTest = [
            { codigo: 'A', creditos: 10, nivel: 1, prereq: '' },
            { codigo: 'B', creditos: 10, nivel: 1, prereq: '' }
        ];

        // Ejecutar proyección pidiendo 30 créditos
        const resultado = computeProjection(mallaTest, historialAlerta, { maxCreditsPerSemester: 30 });

        // Verificaciones
        expect(resultado.studentStatus).toBe('ALERTA');
        expect(resultado.maxCreditsAllowed).toBe(15); // El sistema debió forzar 15
        
        // Como 20 créditos > 15, debió dividir en 2 semestres
        expect(resultado.semesters.length).toBe(2); 
    });
});
