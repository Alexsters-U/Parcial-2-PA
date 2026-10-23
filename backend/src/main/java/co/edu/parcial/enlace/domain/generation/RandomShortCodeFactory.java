package co.edu.parcial.enlace.domain.generation;

public final class RandomShortCodeFactory implements ShortCodeFactory {
    private final RandomCodeGenerator generator = new RandomCodeGenerator();
    public CodeGenerator createGenerator() { return generator; }
    public CollisionResolver createCollisionResolver() { return new RandomCollisionResolver(generator); }
    public String name() { return "random"; }
}
