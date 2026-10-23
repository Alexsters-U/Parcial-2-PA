package co.edu.parcial.enlace.application.port.in;

import co.edu.parcial.enlace.domain.Link;
import co.edu.parcial.enlace.application.service.LinkHistory;

public interface LinkUseCases {
    Link create(String originalUrl);
    LinkHistory history();
    LinkHistory historyFromMongo();
    Link resolve(String shortCode);
    String factoryName();
}
