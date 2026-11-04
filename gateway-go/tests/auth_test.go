package tests

import (
	"testing"
	"time"

	"github.com/masterchat/gateway/internal/auth"
)

func TestPasswordHashing(t *testing.T) {
	password := "SecretMasterKey123!"

	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if !auth.CheckPassword(password, hash) {
		t.Fatalf("Password verification failed for correct password")
	}

	if auth.CheckPassword("WrongPassword!", hash) {
		t.Fatalf("Password verification succeeded for incorrect password")
	}
}

func TestJWTTokens(t *testing.T) {
	secret := "test-secret-key-at-least-32-bytes-long!"
	tm := auth.NewTokenManager(secret, 5*time.Minute, 1*time.Hour)

	userID := "usr-12345"
	email := "test@masterchat.ai"

	access, refresh, err := tm.GeneratePair(userID, email)
	if err != nil {
		t.Fatalf("Failed to generate token pair: %v", err)
	}

	// Validate Access Token
	accessClaims, err := tm.ValidateToken(access, auth.AccessToken)
	if err != nil {
		t.Fatalf("Failed to validate access token: %v", err)
	}
	if accessClaims.UserID != userID || accessClaims.Email != email {
		t.Errorf("Mismatched claims: got user %s, email %s", accessClaims.UserID, accessClaims.Email)
	}

	// Validate Refresh Token
	refreshClaims, err := tm.ValidateToken(refresh, auth.RefreshToken)
	if err != nil {
		t.Fatalf("Failed to validate refresh token: %v", err)
	}
	if refreshClaims.UserID != userID {
		t.Errorf("Mismatched refresh claims: got user %s", refreshClaims.UserID)
	}

	// Mismatched token type check
	_, err = tm.ValidateToken(access, auth.RefreshToken)
	if err == nil {
		t.Fatalf("Expected error when validating access token as refresh token")
	}
}
