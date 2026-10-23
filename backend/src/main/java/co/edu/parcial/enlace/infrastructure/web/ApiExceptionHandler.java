package co.edu.parcial.enlace.infrastructure.web;

import co.edu.parcial.enlace.domain.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<ProblemDetail> invalid(Exception exception) {
        String message = exception instanceof MethodArgumentNotValidException validation
                ? validation.getBindingResult().getAllErrors().getFirst().getDefaultMessage()
                : exception instanceof HttpMessageNotReadableException
                    ? "Envía un objeto JSON con el campo originalUrl." : exception.getMessage();
        return problem(HttpStatus.BAD_REQUEST, "URL no válida", message);
    }

    @ExceptionHandler(LinkNotFoundException.class)
    ResponseEntity<ProblemDetail> missing(LinkNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, "Enlace no encontrado", exception.getMessage());
    }

    @ExceptionHandler(GenerationExhaustedException.class)
    ResponseEntity<ProblemDetail> collision(GenerationExhaustedException exception) {
        return problem(HttpStatus.CONFLICT, "No se pudo generar el enlace", exception.getMessage());
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ProblemDetail> unavailable(DataAccessException exception) {
        LOG.error("Servicio de datos no disponible", exception);
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "Servicio temporalmente no disponible",
                "Comprueba que MongoDB y Redis estén iniciados e inténtalo de nuevo.");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception exception) {
        LOG.error("Error inesperado", exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "No pudimos completar la solicitud", "Inténtalo de nuevo en unos momentos.");
    }

    @ExceptionHandler({HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class, NoResourceFoundException.class})
    ResponseEntity<ProblemDetail> protocol(Exception exception) {
        var error = (ErrorResponse) exception;
        return ResponseEntity.status(error.getStatusCode()).headers(error.getHeaders())
                .cacheControl(CacheControl.noStore()).body(error.getBody());
    }

    private ResponseEntity<ProblemDetail> problem(HttpStatus status, String title, String detail) {
        var body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setTitle(title);
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
