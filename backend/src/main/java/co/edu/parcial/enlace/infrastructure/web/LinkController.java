package co.edu.parcial.enlace.infrastructure.web;

import co.edu.parcial.enlace.application.port.in.LinkUseCases;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
public class LinkController {
    public record CreateLinkRequest(@NotBlank(message = "Escribe una URL para continuar.")
                                    @Size(max = 8192, message = "La URL es demasiado larga.") String originalUrl) {}
    public record HistoryResponse(List<LinkResponse> links, String cacheStatus, long remainingTtlMillis) {}
    private final LinkUseCases links;
    private final String baseUrl;

    public LinkController(LinkUseCases links, @Value("${app.public-base-url}") String baseUrl) {
        this.links = links;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    @PostMapping("/api/links")
    public ResponseEntity<LinkResponse> create(@Valid @RequestBody CreateLinkRequest request) {
        var result = LinkResponse.from(links.create(request.originalUrl()), baseUrl);
        return ResponseEntity.created(URI.create(result.shortUrl())).cacheControl(CacheControl.noStore()).body(result);
    }

    @GetMapping("/api/links")
    public ResponseEntity<HistoryResponse> history(@RequestParam(defaultValue = "cache") String source) {
        var result = switch (source) {
            case "mongo" -> links.historyFromMongo();
            case "cache" -> links.history();
            default -> throw new IllegalArgumentException("source debe ser mongo o cache.");
        };
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("X-Cache", result.cacheStatus())
                .body(new HistoryResponse(result.links().stream().map(link -> LinkResponse.from(link, baseUrl)).toList(),
                        result.cacheStatus(), result.remainingTtlMillis()));
    }

    @GetMapping("/api/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("factory", links.factoryName(), "cacheTtlSeconds", 30));
    }

    @GetMapping("/r/{shortCode}")
    public ResponseEntity<Void> redirect(@PathVariable String shortCode) {
        var link = links.resolve(shortCode);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(link.originalUrl()))
                .cacheControl(CacheControl.noStore()).build();
    }
}
