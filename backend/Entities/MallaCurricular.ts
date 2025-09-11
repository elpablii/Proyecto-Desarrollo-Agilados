export class MallaCurricular {
    idMalla: number;
    idCarrera: number;
    catalogo: string;

    constructor(idMalla: number, idCarrera: number, catalogo: string) {
        this.idMalla = idMalla;
        this.idCarrera = idCarrera;
        this.catalogo = catalogo;
    }
}