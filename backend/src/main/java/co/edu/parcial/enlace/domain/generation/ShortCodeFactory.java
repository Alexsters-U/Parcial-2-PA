package co.edu.parcial.enlace.domain.generation;

/** Abstract Factory: crea dos productos que pertenecen a la misma familia. */
public interface ShortCodeFactory {
    CodeGenerator createGenerator();
    CollisionResolver createCollisionResolver();
    String name();
}
