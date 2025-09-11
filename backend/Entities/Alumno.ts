export class Alumno {
    RUT: string;
    nombre: string;
    apellido: string;
    email: string;
    passwordHash: string;

    constructor(RUT: string, nombre: string, apellido: string, email: string, passwordHash: string) {
        this.RUT = RUT;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.passwordHash = passwordHash;
    }
}

