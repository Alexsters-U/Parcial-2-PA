package co.edu.parcial.enlace.domain;

import java.net.URI;
import java.net.URISyntaxException;

/** Objeto de valor: las reglas se aplican también fuera de HTTP. */
public record OriginalUrl(String value) {
    public OriginalUrl {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Escribe una URL para continuar.");
        }
        value = value.trim();
        if (value.length() > 8192) {
            throw new IllegalArgumentException("La URL debe tener como máximo 8192 caracteres.");
        }
        try {
            URI uri = new URI(value);
            boolean allowed = "http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme());
            if (!allowed || uri.getHost() == null || uri.getHost().isBlank()
                    || uri.getUserInfo() != null || uri.getPort() > 65535) {
                throw new IllegalArgumentException("Usa una URL HTTP o HTTPS con un dominio válido y sin credenciales.");
            }
            value = uri.toASCIIString();
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("La URL contiene caracteres no válidos.");
        }
    }
}
