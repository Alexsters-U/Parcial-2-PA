package co.edu.parcial.enlace.domain.generation;

public interface CollisionResolver {
    String nextCandidate(String originalUrl, int attempt);
}
