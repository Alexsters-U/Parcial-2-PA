package co.edu.parcial.enlace.application.port.out;

import co.edu.parcial.enlace.domain.Link;
import java.util.List;
import java.util.Optional;

public interface LinkRepository {
    Link insert(Link link);
    List<Link> findAll();
    Optional<Link> findByCode(String shortCode);
}
