package com.EventmanagementbyMahesh.event.events.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Event Service API",
                version = "1.0",
                description = "Event Management, Reviews, and Machine Learning Recommendation APIs for EventHub",
                contact = @Contact(name = "EventHub Admin", email = "admin@eventhub.com")
        ),
        security = @SecurityRequirement(name = "Bearer Authentication")
)
@SecurityScheme(
        name = "Bearer Authentication",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Enter JWT Bearer token here. It will be passed in the Authorization header."
)
public class OpenApiConfig {
}
