export class Carrera {
    idCarrera: number;
    codigoCarrera: string;
    nombreCarrera: string;

    constructor(idCarrera: number, codigoCarrera: string, nombreCarrera: string) {
        this.idCarrera = idCarrera;
        this.codigoCarrera = codigoCarrera;
        this.nombreCarrera = nombreCarrera;
    }
}