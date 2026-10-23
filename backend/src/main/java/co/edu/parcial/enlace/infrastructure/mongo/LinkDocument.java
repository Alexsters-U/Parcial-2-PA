package co.edu.parcial.enlace.infrastructure.mongo;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("links")
public record LinkDocument(@Id String id, String originalUrl,
                           @Indexed(unique = true) String shortCode, Instant createdAt) {}
