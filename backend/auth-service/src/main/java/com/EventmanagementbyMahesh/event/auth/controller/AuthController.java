package com.EventmanagementbyMahesh.event.auth.controller;

import com.EventmanagementbyMahesh.event.auth.dto.request.*;
import com.EventmanagementbyMahesh.event.auth.dto.response.AuthResponse;
import com.EventmanagementbyMahesh.event.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication APIs", description = "Endpoints for user registration, login, OAuth, and password management")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @Operation(summary = "Register a new user", description = "Creates a new user account with email and password.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User registered successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input or email already exists")
    })
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        service.register(req);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    @Operation(summary = "Login with email and password", description = "Authenticates a user and returns a JWT or requests OTP verification.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful or OTP required"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(service.login(req));
    }

    @Operation(summary = "Verify OTP", description = "Verifies the OTP sent to the user's email for 2FA.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OTP verified successfully, JWT returned"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired OTP")
    })
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(service.verifyOtp(req));
    }

    @Operation(summary = "Google OAuth Login", description = "Authenticates a user using a Google OAuth JWT credential.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Google login successful, JWT returned"),
            @ApiResponse(responseCode = "401", description = "Invalid Google token")
    })
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody Map<String, String> payload) {
        String credential = payload.get("credential");
        return ResponseEntity.ok(service.loginWithGoogle(credential));
    }

    @Operation(summary = "Forgot Password", description = "Triggers a password reset OTP to be sent to the user's email.")
    @ApiResponse(responseCode = "200", description = "Reset OTP sent successfully")
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        service.forgotPassword(req);
        return ResponseEntity.ok(Map.of("message", "Reset OTP sent to your email"));
    }

    @Operation(summary = "Reset Password", description = "Resets the user's password using the OTP received via email.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password reset successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid OTP or request")
    })
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        service.resetPassword(req);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @Operation(summary = "Internal: Get User By Email", description = "Internal service-to-service call to fetch a user by email.")
    @GetMapping("/internal/users/by-email")
    public ResponseEntity<?> getUserByEmail(@Parameter(description = "User's email address") @RequestParam String email) {
        return service.getUserByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Internal: Get User Analytics", description = "Internal endpoint to fetch global user analytics.")
    @GetMapping("/internal/users/analytics")
    public ResponseEntity<?> getUserAnalytics() {
        return ResponseEntity.ok(service.getUserAnalytics());
    }
}