package co.edu.parcial.enlace.domain.generation;

public record RandomCollisionResolver(RandomCodeGenerator generator) implements CollisionResolver {
    @Override
    public String nextCandidate(String originalUrl, int attempt) {
        return generator.generate(originalUrl);
    }
}
