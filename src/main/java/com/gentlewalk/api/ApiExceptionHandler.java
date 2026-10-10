package com.gentlewalk.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationException(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Request validation failed"
        );
        problem.setTitle("Validation Error");
        problem.setType(URI.create("https://gentlewalk.app/errors/validation"));
        problem.setProperty("timestamp", Instant.now().toString());

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        problem.setProperty("invalidFields", fieldErrors);
        return problem;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );
        problem.setTitle("Bad Request");
        problem.setType(URI.create("https://gentlewalk.app/errors/bad-request"));
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_ENTITY,
                ex.getMessage()
        );
        problem.setTitle("Unprocessable Entity");
        problem.setType(URI.create("https://gentlewalk.app/errors/unprocessable"));
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }

    @ExceptionHandler(RestClientResponseException.class)
    public ProblemDetail handleRestClientResponse(RestClientResponseException ex) {
        log.warn("External upstream service responded with error: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY,
                "External service returned error (" + ex.getStatusCode() + "): " + ex.getStatusText()
        );
        problem.setTitle("Bad Gateway");
        problem.setType(URI.create("https://gentlewalk.app/errors/upstream-error"));
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }

    @ExceptionHandler(RuntimeException.class)
    public ProblemDetail handleRuntimeException(RuntimeException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "An unexpected server error occurred";
        if (msg.contains("Overpass") || msg.contains("Open-Meteo")) {
            log.warn("Upstream service failure: {}", msg);
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, msg);
            problem.setTitle("Upstream Service Error");
            problem.setType(URI.create("https://gentlewalk.app/errors/upstream-error"));
            problem.setProperty("timestamp", Instant.now().toString());
            return problem;
        }

        log.error("Internal runtime error: ", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, msg);
        problem.setTitle("Internal Server Error");
        problem.setType(URI.create("https://gentlewalk.app/errors/internal"));
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }
}
