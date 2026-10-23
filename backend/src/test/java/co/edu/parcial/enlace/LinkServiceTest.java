package co.edu.parcial.enlace;

import co.edu.parcial.enlace.application.port.out.*;
import co.edu.parcial.enlace.application.service.LinkService;
import co.edu.parcial.enlace.domain.*;
import co.edu.parcial.enlace.domain.generation.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LinkServiceTest {
    private final LinkRepository repository = mock(LinkRepository.class);
    private final HistoryCache cache = mock(HistoryCache.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-22T15:00:00Z"), ZoneOffset.UTC);
    private LinkService service(ShortCodeFactory factory) { return new LinkService(repository, cache, factory, clock); }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "ftp://example.com", "javascript:alert(1)", "https://", "example.com", "https://user:pass@example.com", "https://example.com:99999"})
    void rejectsInvalidUrls(String value) {
        assertThatThrownBy(() -> service(new RandomShortCodeFactory()).create(value)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository, cache);
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://example.com", "https://example.com/path?q=1#section", "http://localhost:8080/path", "https://example.com/niño"})
    void acceptsWebUrls(String value) { assertThat(new OriginalUrl(value).value()).startsWith("http"); }

    @Test
    void createsAndInvalidatesBeforeSaving() {
        when(repository.insert(any())).thenAnswer(call -> call.getArgument(0));
        var link = service(new RandomShortCodeFactory()).create(" https://example.com ");
        assertThat(link.shortCode()).matches("[A-Za-z0-9]{8}");
        assertThat(link.createdAt()).isEqualTo(clock.instant());
        assertThat(link.originalUrl()).isEqualTo("https://example.com");
        var order = inOrder(cache, repository);
        order.verify(cache).invalidate();
        order.verify(repository).insert(any());
    }

    @Test
    void changingFactoryChangesBothInitialAndCollisionCandidates() {
        var factory = spy(new HashShortCodeFactory());
        var resolver = spy(factory.createCollisionResolver());
        doReturn(resolver).when(factory).createCollisionResolver();
        when(repository.insert(any())).thenThrow(new CodeCollisionException()).thenAnswer(call -> call.getArgument(0));
        var link = service(factory).create("https://example.com");
        assertThat(link.shortCode()).matches("[a-z0-9]{9}");
        assertThat(link.shortCode()).isNotEqualTo(factory.createGenerator().generate("https://example.com"));
        verify(repository, times(2)).insert(any());
        verify(resolver).nextCandidate("https://example.com", 1);
    }

    @Test
    void hashFamilyAllowsMoreThanSixteenLinksForOneDestination() {
        Set<String> codes = new HashSet<>();
        when(repository.insert(any())).thenAnswer(call -> {
            Link link = call.getArgument(0);
            if (!codes.add(link.shortCode())) throw new CodeCollisionException();
            return link;
        });
        var service = service(new HashShortCodeFactory());
        for (int i = 0; i < 40; i++) service.create("https://example.com/repeated");
        assertThat(codes).hasSize(40);
    }

    @Test
    void collisionsAreBounded() {
        when(repository.insert(any())).thenThrow(new CodeCollisionException());
        assertThatThrownBy(() -> service(new RandomShortCodeFactory()).create("https://example.com"))
                .isInstanceOf(GenerationExhaustedException.class);
        verify(repository, times(16)).insert(any());
    }

    @Test
    void missQueriesDatabaseAndReportsStoredTtlForVisualExpiration() {
        when(cache.find()).thenReturn(Optional.empty());
        when(repository.findAll()).thenReturn(List.of());
        when(cache.store(List.of())).thenReturn(29840L);
        var result = service(new RandomShortCodeFactory()).history();
        assertThat(result.cacheStatus()).isEqualTo("MISS");
        assertThat(result.remainingTtlMillis()).isEqualTo(29840);
        verify(cache).store(List.of());
    }

    @Test
    void firstVisitReadsMongoWithoutUsingRedis() {
        var stored = List.of(new Link("id", "https://example.com", "abcd1234", clock.instant()));
        when(repository.findAll()).thenReturn(stored);
        var result = service(new RandomShortCodeFactory()).historyFromMongo();
        assertThat(result.links()).isEqualTo(stored);
        assertThat(result.cacheStatus()).isEqualTo("BYPASS");
        assertThat(result.remainingTtlMillis()).isZero();
        verifyNoInteractions(cache);
    }

    @Test
    void hitReturnsRealRemainingTtlWithoutReadingMongoOrRenewing() {
        when(cache.find()).thenReturn(Optional.of(new HistoryCache.Entry(List.of(), 12810)));
        var result = service(new RandomShortCodeFactory()).history();
        assertThat(result.cacheStatus()).isEqualTo("HIT");
        assertThat(result.remainingTtlMillis()).isEqualTo(12810);
        verifyNoInteractions(repository);
        verify(cache, never()).store(any());
    }

    @Test
    void redisFailurePreventsPartiallySuccessfulCreation() {
        doThrow(new IllegalStateException("unavailable")).when(cache).invalidate();
        assertThatThrownBy(() -> service(new RandomShortCodeFactory()).create("https://example.com"))
                .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void unknownCodeIsNotFound() {
        when(repository.findByCode("abcdefgh")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service(new RandomShortCodeFactory()).resolve("abcdefgh"))
                .isInstanceOf(LinkNotFoundException.class);
    }

    @Test
    void invalidCodeNeverQueriesMongo() {
        assertThatThrownBy(() -> service(new RandomShortCodeFactory()).resolve("bad!"))
                .isInstanceOf(LinkNotFoundException.class);
        verifyNoInteractions(repository);
    }
}
