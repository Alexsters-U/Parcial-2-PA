package co.edu.parcial.enlace.application.port.out;

import co.edu.parcial.enlace.domain.Link;
import java.util.List;
import java.util.Optional;

public interface HistoryCache {
    record Entry(List<Link> links, long remainingTtlMillis) {}
    Optional<Entry> find();
    long store(List<Link> links);
    void invalidate();
}
