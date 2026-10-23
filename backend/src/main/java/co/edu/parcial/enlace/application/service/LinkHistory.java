package co.edu.parcial.enlace.application.service;

import co.edu.parcial.enlace.domain.Link;
import java.util.List;

public record LinkHistory(List<Link> links, String cacheStatus, long remainingTtlMillis) {}
