export class Asignatura {
    codigo_asignatura: string;
    nombre_asignatura: string;
    creditos: number;
    prerequisitos: Asignatura[];
    semestre_en_que_se_imparte: number;
}
