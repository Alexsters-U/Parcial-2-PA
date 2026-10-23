package co.edu.parcial.enlace.infrastructure.web;

import co.edu.parcial.enlace.domain.Link;
import java.time.Instant;

public record LinkResponse(String id, String originalUrl, String shortCode, String shortUrl, Instant createdAt) {
    public static LinkResponse from(Link link, String baseUrl) {
        return new LinkResponse(link.id(), link.originalUrl(), link.shortCode(),
                baseUrl + "/r/" + link.shortCode(), link.createdAt());
    }
}
