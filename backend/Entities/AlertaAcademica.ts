export class AlertaAcademica {
    idAlerta: number;
    RUTAlumno: string;
    idCarrera: number;
    tipoAlerta: string;
    descripcion: string;
    prioridad: number;
    fechaGeneracion: Date;

    constructor(idAlerta: number, RUTAlumno: string, idCarrera: number, tipoAlerta: string, descripcion: string, prioridad: number, fechaGeneracion: Date) {
        this.idAlerta = idAlerta;
        this.RUTAlumno = RUTAlumno;
        this.idCarrera = idCarrera;
        this.tipoAlerta = tipoAlerta;
        this.descripcion = descripcion;
        this.prioridad = prioridad;
        this.fechaGeneracion = fechaGeneracion;
    }
}