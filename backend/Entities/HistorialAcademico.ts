export class HistorialAcademico {
    idHistorial: number;
    RUTAlumno: string;
    idCarrera: number;
    idAsignatura: number;
    periodo: string;
    estado: 'APROBADO' | 'REPROBADO' | 'INSCRITO' | 'CONVALIDADO';
    numeroIntento: number;

    constructor(idHistorial: number, RUTAlumno: string, idCarrera: number, idAsignatura: number, periodo: string, estado: 'APROBADO' | 'REPROBADO' | 'INSCRITO' | 'CONVALIDADO', numeroIntento: number) {
        this.idHistorial = idHistorial;
        this.RUTAlumno = RUTAlumno;
        this.idCarrera = idCarrera;
        this.idAsignatura = idAsignatura;
        this.periodo = periodo;
        this.estado = estado;
        this.numeroIntento = numeroIntento;
    }
}