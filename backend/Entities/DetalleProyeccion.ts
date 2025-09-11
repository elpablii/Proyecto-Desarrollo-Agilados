export class DetalleProyeccion {
    idDetalle: number;
    idProyeccion: number;
    idAsignatura: number;
    anioProyectado: number;
    semestreProyectado: number;

    constructor(idDetalle: number, idProyeccion: number, idAsignatura: number, anioProyectado: number, semestreProyectado: number) {
        this.idDetalle = idDetalle;
        this.idProyeccion = idProyeccion;
        this.idAsignatura = idAsignatura;
        this.anioProyectado = anioProyectado;
        this.semestreProyectado = semestreProyectado;
    }
}