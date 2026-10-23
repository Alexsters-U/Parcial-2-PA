package co.edu.parcial.enlace.application.service;

import co.edu.parcial.enlace.application.port.in.LinkUseCases;
import co.edu.parcial.enlace.application.port.out.HistoryCache;
import co.edu.parcial.enlace.application.port.out.LinkRepository;
import co.edu.parcial.enlace.domain.*;
import co.edu.parcial.enlace.domain.generation.*;
import java.time.Clock;

/** Caso de uso sin dependencias de Spring, MongoDB ni Redis. */
public final class LinkService implements LinkUseCases {
    private final LinkRepository repository;
    private final HistoryCache cache;
    private final CodeGenerator generator;
    private final CollisionResolver collisions;
    private final String factoryName;
    private final Clock clock;

    public LinkService(LinkRepository repository, HistoryCache cache, ShortCodeFactory factory, Clock clock) {
        this.repository = repository;
        this.cache = cache;
        this.generator = factory.createGenerator();
        this.collisions = factory.createCollisionResolver();
        this.factoryName = factory.name();
        this.clock = clock;
    }

    // Un monitor común impide repoblar un historial viejo durante una creación.
    // El despliegue académico usa exactamente una instancia del backend.
    @Override
    public synchronized Link create(String originalUrl) {
        String validUrl = new OriginalUrl(originalUrl).value();
        // Invalidar antes de insertar evita guardar y luego devolver error si Redis falla.
        // history() no puede ejecutarse entre esta invalidación y el insert.
        cache.invalidate();
        String candidate = generator.generate(validUrl);
        for (int attempt = 0; attempt < 16; attempt++) {
            try {
                return repository.insert(new Link(null, validUrl, candidate, clock.instant()));
            } catch (CodeCollisionException e) {
                if (attempt < 15) candidate = collisions.nextCandidate(validUrl, attempt + 1);
            }
        }
        throw new GenerationExhaustedException();
    }

    @Override
    public synchronized LinkHistory history() {
        var hit = cache.find();
        if (hit.isPresent()) {
            var entry = hit.get();
            return new LinkHistory(entry.links(), "HIT", entry.remainingTtlMillis());
        }
        var links = repository.findAll();
        long remainingTtl = cache.store(links);
        return new LinkHistory(links, "MISS", remainingTtl);
    }

    @Override
    public synchronized LinkHistory historyFromMongo() {
        // Primera visita: lectura directa, sin consultar ni modificar Redis.
        return new LinkHistory(repository.findAll(), "BYPASS", 0);
    }

    @Override
    public Link resolve(String shortCode) {
        if (!shortCode.matches("[a-zA-Z0-9]{8,10}")) throw new LinkNotFoundException();
        return repository.findByCode(shortCode).orElseThrow(LinkNotFoundException::new);
    }

    @Override
    public String factoryName() { return factoryName; }
}
