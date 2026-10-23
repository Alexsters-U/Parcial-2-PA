package co.edu.parcial.enlace.infrastructure.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface SpringLinkRepository extends MongoRepository<LinkDocument, String> {
    Optional<LinkDocument> findByShortCode(String shortCode);
}
