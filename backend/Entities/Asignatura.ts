export class Asignatura {
    idAsignatura: number;
    idMalla: number;
    codigoAsignatura: string;
    nombreAsignatura: string;
    creditos: number;
    semestreMalla: number;

    constructor(idAsignatura: number, idMalla: number, codigoAsignatura: string, nombreAsignatura: string, creditos: number, semestreMalla: number) {
        this.idAsignatura = idAsignatura;
        this.idMalla = idMalla;
        this.codigoAsignatura = codigoAsignatura;
        this.nombreAsignatura = nombreAsignatura;
        this.creditos = creditos;
        this.semestreMalla = semestreMalla;
    }
}
