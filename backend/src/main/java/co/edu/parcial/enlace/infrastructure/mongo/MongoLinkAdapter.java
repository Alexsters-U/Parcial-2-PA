package co.edu.parcial.enlace.infrastructure.mongo;

import co.edu.parcial.enlace.application.port.out.LinkRepository;
import co.edu.parcial.enlace.domain.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public class MongoLinkAdapter implements LinkRepository {
    private final SpringLinkRepository mongo;
    public MongoLinkAdapter(SpringLinkRepository mongo) { this.mongo = mongo; }

    public Link insert(Link link) {
        try {
            return toDomain(mongo.insert(new LinkDocument(null, link.originalUrl(), link.shortCode(), link.createdAt())));
        } catch (DuplicateKeyException e) {
            throw new CodeCollisionException();
        }
    }

    public List<Link> findAll() {
        return mongo.findAll(Sort.by(Sort.Direction.DESC, "createdAt", "id")).stream()
                .map(MongoLinkAdapter::toDomain).toList();
    }

    public Optional<Link> findByCode(String code) { return mongo.findByShortCode(code).map(MongoLinkAdapter::toDomain); }

    private static Link toDomain(LinkDocument doc) {
        return new Link(doc.id(), doc.originalUrl(), doc.shortCode(), doc.createdAt());
    }
}
