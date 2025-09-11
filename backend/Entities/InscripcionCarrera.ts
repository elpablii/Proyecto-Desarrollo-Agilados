export class InscripcionCarrera {
    RUTAlumno: string;
    idCarrera: number;
    catalogo: string;

    constructor(RUTAlumno: string, idCarrera: number, catalogo: string) {
        this.RUTAlumno = RUTAlumno;
        this.idCarrera = idCarrera;
        this.catalogo = catalogo;
    }
}