package co.edu.parcial.enlace.infrastructure.redis;

import co.edu.parcial.enlace.application.port.out.HistoryCache;
import co.edu.parcial.enlace.domain.Link;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Component
public class RedisHistoryAdapter implements HistoryCache {
    public static final String KEY = "enlace:history:v1";
    private static final Duration TTL = Duration.ofSeconds(30);
    private static final DefaultRedisScript<Long> WRITE = new DefaultRedisScript<>("""
        redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
        return redis.call('PTTL', KEYS[1])
        """, Long.class);
    // GET y PTTL en una operación atómica: el TTL pertenece al mismo valor leído.
    private static final DefaultRedisScript<List> READ = new DefaultRedisScript<>("""
        local value = redis.call('GET', KEYS[1])
        if not value then return {} end
        local ttl = redis.call('PTTL', KEYS[1])
        if ttl <= 0 then return {} end
        return {value, tostring(ttl)}
        """, List.class);
    private final StringRedisTemplate redis;
    private final ObjectMapper json;

    public RedisHistoryAdapter(StringRedisTemplate redis, ObjectMapper json) {
        this.redis = redis;
        this.json = json;
    }

    @Override
    public Optional<Entry> find() {
        List<?> result = redis.execute(READ, List.of(KEY));
        if (result == null || result.isEmpty()) return Optional.empty();
        try {
            List<Link> links = json.readValue(result.get(0).toString(), new TypeReference<>() {});
            return Optional.of(new Entry(links, Long.parseLong(result.get(1).toString())));
        } catch (JsonProcessingException | NumberFormatException e) {
            // Un caché ilegible se reconstruye desde la fuente de verdad.
            invalidate();
            return Optional.empty();
        }
    }

    @Override
    public long store(List<Link> links) {
        try {
            Long remaining = redis.execute(WRITE, List.of(KEY), json.writeValueAsString(links),
                    Long.toString(TTL.toMillis()));
            return remaining == null ? 0 : remaining;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar el historial.", e);
        }
    }

    @Override
    public void invalidate() { redis.delete(KEY); }
}
