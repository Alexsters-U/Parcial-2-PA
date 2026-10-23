package co.edu.parcial.enlace.domain;

/** El índice único rechazó un candidato; el caso de uso puede reintentar. */
public class CodeCollisionException extends RuntimeException {
    public CodeCollisionException() { super("El código generado ya existe."); }
}
