package co.edu.parcial.enlace.domain.generation;

import java.util.UUID;

public record SaltedHashCollisionResolver(HashCodeGenerator generator) implements CollisionResolver {
    @Override
    public String nextCandidate(String originalUrl, int attempt) {
        // La sal nueva evita limitar una URL a solo 16 códigos durante toda su vida.
        return generator.generate(originalUrl + "#collision:" + attempt + ":" + UUID.randomUUID());
    }
}
