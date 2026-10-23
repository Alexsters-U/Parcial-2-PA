package co.edu.parcial.enlace.domain.generation;

public final class HashShortCodeFactory implements ShortCodeFactory {
    private final HashCodeGenerator generator = new HashCodeGenerator();
    public CodeGenerator createGenerator() { return generator; }
    public CollisionResolver createCollisionResolver() { return new SaltedHashCollisionResolver(generator); }
    public String name() { return "hash"; }
}
