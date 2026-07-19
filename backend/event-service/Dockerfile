# =============================================================
# Event Service — Multi-Stage Dockerfile
# Build context: backend/ (parent directory)
# =============================================================

# ─── Stage 1: Build ───────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy parent POM (multi-module project descriptor)
COPY pom.xml ./
COPY common-library/pom.xml ./common-library/pom.xml
COPY auth-service/pom.xml ./auth-service/pom.xml
COPY event-service/pom.xml ./event-service/pom.xml
COPY booking-service/pom.xml ./booking-service/pom.xml
COPY gateway-service/pom.xml ./gateway-service/pom.xml
COPY coverage-report/pom.xml ./coverage-report/pom.xml
COPY e2e-tests/pom.xml ./e2e-tests/pom.xml

RUN mvn dependency:go-offline \
    -pl common-library,event-service \
    -am \
    --no-transfer-progress \
    -q || true

# Copy source code
COPY common-library/src ./common-library/src
COPY event-service/src ./event-service/src

# Build event-service and its dependency (common-library)
RUN mvn clean package \
    -pl event-service \
    -am \
    -DskipTests \
    --no-transfer-progress

# ─── Stage 2: Runtime ─────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/event-service/target/*.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8082

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
