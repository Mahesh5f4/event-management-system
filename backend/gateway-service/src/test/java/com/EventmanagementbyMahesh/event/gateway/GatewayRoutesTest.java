package com.EventmanagementbyMahesh.event.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayRoutesTest {

    @Autowired
    private WebTestClient webClient;

    @Test
    void corsConfiguration_AllowsLocalhost() {
        webClient.options()
                .uri("/api/auth/login")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .exchange()
                .expectStatus().isOk()
                .expectHeader().valueEquals("Access-Control-Allow-Origin", "http://localhost:5173")
                .expectHeader().valueMatches("Access-Control-Allow-Methods", ".*POST.*");
    }

    @Test
    void authInternalApi_ShouldBeForbiddenOrNotFound() {
        // We added a rewrite path filter for /api/auth/internal to /api/auth/forbidden
        // Which should effectively block external access
        webClient.get()
                .uri("/api/auth/internal/users/by-email?email=test@example.com")
                .exchange()
                .expectStatus().is4xxClientError(); // Depending on downstream it returns 404
    }
}
