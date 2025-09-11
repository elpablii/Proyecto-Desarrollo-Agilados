export class Proyeccion {
    idProyeccion: number;
    RUTAlumno: string;
    idCarrera: number;
    nombreProyeccion: string;
    fechaCreacion: Date;
    esAutogenerada: boolean;

    constructor(idProyeccion: number, RUTAlumno: string, idCarrera: number, nombreProyeccion: string, fechaCreacion: Date, esAutogenerada: boolean) {
        this.idProyeccion = idProyeccion;
        this.RUTAlumno = RUTAlumno;
        this.idCarrera = idCarrera;
        this.nombreProyeccion = nombreProyeccion;
        this.fechaCreacion = fechaCreacion;
        this.esAutogenerada = esAutogenerada;
    }
}