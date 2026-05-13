package com.EventmanagementbyMahesh.event.auth.dto.response;

public class AuthResponse {
    public String token;
    public String role;
    public boolean requires2FA;
    public String email;

    public AuthResponse(String token, String role) {
        this.token = token;
        this.role = role;
        this.requires2FA = false;
    }

    public AuthResponse(boolean requires2FA, String email) {
        this.requires2FA = requires2FA;
        this.email = email;
    }
}