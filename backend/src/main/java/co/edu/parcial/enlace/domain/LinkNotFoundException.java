package co.edu.parcial.enlace.domain;

public class LinkNotFoundException extends RuntimeException {
    public LinkNotFoundException() { super("No encontramos un enlace con ese código."); }
}
