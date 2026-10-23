package co.edu.parcial.enlace.infrastructure.config;

import co.edu.parcial.enlace.application.port.in.LinkUseCases;
import co.edu.parcial.enlace.application.port.out.*;
import co.edu.parcial.enlace.application.service.LinkService;
import co.edu.parcial.enlace.domain.generation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.time.Clock;

@Configuration
public class ApplicationConfig {
    @Bean
    ShortCodeFactory shortCodeFactory(@Value("${app.factory}") String factory) {
        return switch (factory) {
            case "random" -> new RandomShortCodeFactory();
            case "hash" -> new HashShortCodeFactory();
            default -> throw new IllegalArgumentException("LINK_FACTORY debe ser random o hash.");
        };
    }

    @Bean
    LinkUseCases linkUseCases(LinkRepository repository, HistoryCache cache, ShortCodeFactory factory) {
        return new LinkService(repository, cache, factory, Clock.systemUTC());
    }

    @Bean
    WebMvcConfigurer cors(@Value("${app.cors-origins}") String origins) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**").allowedOrigins(origins.split(","))
                        .allowedMethods("GET", "POST").allowedHeaders("Content-Type");
            }
        };
    }
}
