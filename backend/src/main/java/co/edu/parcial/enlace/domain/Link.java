package co.edu.parcial.enlace.domain;

import java.time.Instant;

public record Link(String id, String originalUrl, String shortCode, Instant createdAt) {
    public Link {
        originalUrl = new OriginalUrl(originalUrl).value();
        if (shortCode == null || !shortCode.matches("[a-zA-Z0-9]{8,10}")) {
            throw new IllegalArgumentException("El código debe ser alfanumérico y tener entre 8 y 10 caracteres.");
        }
        if (createdAt == null) throw new IllegalArgumentException("La fecha es obligatoria.");
    }
}
