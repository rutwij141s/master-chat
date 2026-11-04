package tests

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/auth"
	"github.com/masterchat/gateway/internal/db"
	"github.com/masterchat/gateway/internal/handlers"
	"github.com/masterchat/gateway/internal/middleware"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.RequestIDMiddleware())

	tm := auth.NewTokenManager("test-secret-at-least-32-chars-long!", time.Hour, 24*time.Hour)
	database, _ := db.ConnectPostgres("postgresql://invalid-url-force-mock")
	authHandler := handlers.NewAuthHandler(database, tm)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/auth/register", authHandler.Register)
	r.POST("/auth/login", authHandler.Login)

	protected := r.Group("/protected")
	protected.Use(middleware.AuthRequired(tm))
	{
		protected.GET("/ping", func(c *gin.Context) {
			userID, _ := c.Get("userID")
			c.JSON(http.StatusOK, gin.H{"pong": true, "user_id": userID})
		})
	}

	return r
}

func TestAuthFlowEndpoints(t *testing.T) {
	router := setupTestRouter()

	tests := []struct {
		name         string
		method       string
		path         string
		body         string
		headerAuth   string
		expectedCode int
	}{
		{
			name:         "Health Check",
			method:       "GET",
			path:         "/health",
			body:         "",
			expectedCode: http.StatusOK,
		},
		{
			name:         "Protected Route Without Auth Header",
			method:       "GET",
			path:         "/protected/ping",
			body:         "",
			expectedCode: http.StatusUnauthorized,
		},
		{
			name:         "Register New User",
			method:       "POST",
			path:         "/auth/register",
			body:         `{"email":"alice@example.com","password":"ValidPassword123!","full_name":"Alice Wonderland"}`,
			expectedCode: http.StatusCreated,
		},
		{
			name:         "Login Valid User",
			method:       "POST",
			path:         "/auth/login",
			body:         `{"email":"alice@example.com","password":"ValidPassword123!"}`,
			expectedCode: http.StatusOK,
		},
		{
			name:         "Login Invalid Password",
			method:       "POST",
			path:         "/auth/login",
			body:         `{"email":"alice@example.com","password":"WrongPassword!"}`,
			expectedCode: http.StatusUnauthorized,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			if tc.headerAuth != "" {
				req.Header.Set("Authorization", tc.headerAuth)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tc.expectedCode {
				t.Errorf("Expected status %d, got %d. Body: %s", tc.expectedCode, w.Code, w.Body.String())
			}
		})
	}
}
