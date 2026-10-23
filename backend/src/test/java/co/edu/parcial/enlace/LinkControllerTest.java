package co.edu.parcial.enlace;

import co.edu.parcial.enlace.application.port.in.LinkUseCases;
import co.edu.parcial.enlace.application.service.LinkHistory;
import co.edu.parcial.enlace.domain.*;
import co.edu.parcial.enlace.infrastructure.web.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.Instant;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LinkControllerTest {
    private final LinkUseCases useCases = mock(LinkUseCases.class);
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new LinkController(useCases, "http://localhost:5173"))
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @Test
    void creates201WithPublicLink() throws Exception {
        when(useCases.create("https://example.com")).thenReturn(new Link("id", "https://example.com", "abcd1234", Instant.now()));
        mvc.perform(post("/api/links").contentType("application/json").content("{\"originalUrl\":\"https://example.com\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.shortUrl").value("http://localhost:5173/r/abcd1234"));
    }

    @Test
    void redirects302WithLocationAndNoBrowserCache() throws Exception {
        when(useCases.resolve("abcd1234")).thenReturn(new Link("id", "https://example.com/path", "abcd1234", Instant.now()));
        mvc.perform(get("/r/abcd1234")).andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com/path"))
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    void rejectsEmptyBodyWithProblemDetails() throws Exception {
        mvc.perform(post("/api/links").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(useCases);
    }

    @Test
    void missingCodeReturns404() throws Exception {
        when(useCases.resolve("abcd1234")).thenThrow(new LinkNotFoundException());
        mvc.perform(get("/r/abcd1234")).andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void unsupportedMethodRemains405() throws Exception {
        mvc.perform(delete("/api/links")).andExpect(status().isMethodNotAllowed());
    }

    @Test
    void historyReportsTtlEvenOnMiss() throws Exception {
        when(useCases.history()).thenReturn(new LinkHistory(List.of(), "MISS", 29840));
        mvc.perform(get("/api/links")).andExpect(status().isOk())
                .andExpect(header().string("X-Cache", "MISS"))
                .andExpect(jsonPath("$.remainingTtlMillis").value(29840));
    }

    @Test
    void mongoSourceBypassesCacheForFirstVisit() throws Exception {
        when(useCases.historyFromMongo()).thenReturn(new LinkHistory(List.of(), "BYPASS", 0));
        mvc.perform(get("/api/links").param("source", "mongo"))
                .andExpect(status().isOk()).andExpect(header().string("X-Cache", "BYPASS"))
                .andExpect(jsonPath("$.remainingTtlMillis").value(0));
        verify(useCases, never()).history();
    }

    @Test
    void invalidHistorySourceReturns400() throws Exception {
        mvc.perform(get("/api/links").param("source", "other")).andExpect(status().isBadRequest());
        verifyNoInteractions(useCases);
    }
}
