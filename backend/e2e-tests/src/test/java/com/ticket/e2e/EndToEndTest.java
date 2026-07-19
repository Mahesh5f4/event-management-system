package com.ticket.e2e;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class EndToEndTest {

    private static final String BASE_URL = "http://localhost:8080/api";

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = BASE_URL;
    }

    @Test
    void userCanRegisterLoginAndFetchEvents() {
        // 1. Register a new user
        String email = "e2euser_" + System.currentTimeMillis() + "@example.com";
        String password = "password123!";

        given()
            .contentType(ContentType.JSON)
            .body("{ \"name\": \"E2E User\", \"email\": \"" + email + "\", \"password\": \"" + password + "\", \"role\": \"USER\" }")
        .when()
            .post("/auth/register")
        .then()
            .statusCode(isOneOf(200, 201)); // Assuming either 200 or 201 is returned on success

        // 2. Login to get token
        String token = given()
            .contentType(ContentType.JSON)
            .body("{ \"email\": \"" + email + "\", \"password\": \"" + password + "\" }")
        .when()
            .post("/auth/login")
        .then()
            .statusCode(200)
            .body("token", notNullValue())
            .extract().path("token");

        // 3. Fetch Events
        given()
            .header("Authorization", "Bearer " + token)
        .when()
            .get("/events?page=0&size=10")
        .then()
            .statusCode(200)
            .body("content", notNullValue());
            
        // Note: For a true E2E flow, we would create an event as ADMIN, then book it as USER.
        // But since this is a basic test verifying gateway -> auth & event communication, this suffices.
    }
}
