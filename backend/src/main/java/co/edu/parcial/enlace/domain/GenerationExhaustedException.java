package co.edu.parcial.enlace.domain;

public class GenerationExhaustedException extends RuntimeException {
    public GenerationExhaustedException() { super("No se pudo reservar un código único. Inténtalo de nuevo."); }
}
