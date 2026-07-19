# =============================================================
# Gateway Service — Multi-Stage Dockerfile
# Build context: backend/ (parent directory)
# Note: Uses Spring Cloud Gateway (WebFlux/reactive), not MVC
# =============================================================

# ─── Stage 1: Build ───────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy parent POM (multi-module project descriptor)
COPY pom.xml ./pom.xml

# Gateway does NOT depend on common-library directly (no JPA, etc.)
# but we still need to resolve the parent POM modules correctly.
# Copy common-library POM only (src not needed — not a dependency of gateway)
COPY common-library/pom.xml ./common-library/pom.xml

# Copy gateway-service POM
COPY gateway-service/pom.xml ./gateway-service/pom.xml

# Download dependencies (cached layer)
RUN mvn dependency:go-offline \
    -pl gateway-service \
    -am \
    --no-transfer-progress \
    -q || true

# Copy gateway source code only (no common-library src needed)
COPY gateway-service/src ./gateway-service/src

# Also need common-library source if it's listed as a sibling module
# that Maven resolves — create an empty src to satisfy the reactor
RUN mkdir -p ./common-library/src/main/java

# Build gateway-service
RUN mvn clean package \
    -pl gateway-service \
    -am \
    -DskipTests \
    --no-transfer-progress

# ─── Stage 2: Runtime ─────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/gateway-service/target/*.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8080

# Gateway is reactive (WebFlux) — same JVM tuning applies
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
