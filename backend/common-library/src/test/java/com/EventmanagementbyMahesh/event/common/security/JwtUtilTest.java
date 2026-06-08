package com.EventmanagementbyMahesh.event.common.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtUtilTest {

    @Test
    void generateTokenAndExtractClaims() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "mysecretkeymysecretkeymysecretkey123456");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 60000L);

        String token = jwtUtil.generateToken("user@example.com", "USER");
        Claims claims = jwtUtil.extract(token);

        assertEquals("user@example.com", claims.getSubject());
        assertEquals("USER", claims.get("role", String.class));
    }
}
