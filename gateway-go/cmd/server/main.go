package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/auth"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/db"
	"github.com/masterchat/gateway/internal/handlers"
	"github.com/masterchat/gateway/internal/middleware"
	"github.com/masterchat/gateway/internal/redis"
)

func main() {
	cfg := config.LoadConfig()

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	middleware.Logger.Info("Starting MasterChat API Gateway",
		"port", cfg.Port,
		"env", cfg.Environment,
		"ai_service", cfg.AIServiceURL,
	)

	// Connect PostgreSQL
	database, err := db.ConnectPostgres(cfg.DatabaseURL)
	if err != nil {
		middleware.Logger.Error("PostgreSQL initialization error", "err", err.Error())
	} else {
		middleware.Logger.Info("PostgreSQL connection initialized")
	}

	// Connect Redis
	redisClient := redis.ConnectRedis(cfg.RedisURL)
	middleware.Logger.Info("Redis connection initialized")

	// Token manager
	tokenManager := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTAccessExpiry, cfg.JWTRefreshExpiry)

	// Handlers
	authHandler := handlers.NewAuthHandler(database, tokenManager)
	chatHandler := handlers.NewChatHandler(cfg)
	convHandler := handlers.NewConversationHandler(cfg)
	docHandler := handlers.NewDocumentHandler(cfg)
	modelHandler := handlers.NewModelHandler(cfg)
	usageHandler := handlers.NewUsageHandler(cfg)
	healthHandler := handlers.NewHealthHandler(database, redisClient)

	// Router setup
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.RequestIDMiddleware())
	r.Use(middleware.StructuredLogger())

	// Public routes
	r.GET("/health", healthHandler.Health)
	r.GET("/ready", healthHandler.Ready)

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/refresh", authHandler.Refresh)
	}

	// Protected routes (require JWT auth and per-user rate limiting)
	api := r.Group("/")
	api.Use(middleware.AuthRequired(tokenManager))
	api.Use(middleware.RateLimitMiddleware(redisClient, cfg.RateLimitRequestsPerMin))
	{
		// Models
		api.GET("/models", modelHandler.ListModels)

		// Conversations
		api.GET("/conversations", convHandler.ListConversations)
		api.POST("/conversations", convHandler.CreateConversation)
		api.DELETE("/conversations/:id", convHandler.DeleteConversation)
		api.GET("/conversations/:id/messages", convHandler.GetMessages)

		// Streaming Chat (SSE proxy)
		api.POST("/chat/stream", chatHandler.StreamChat)

		// Documents & RAG
		api.POST("/documents/upload", docHandler.UploadDocument)
		api.GET("/documents", docHandler.ListDocuments)
		api.DELETE("/documents/:id", docHandler.DeleteDocument)

		// Usage
		api.GET("/usage", usageHandler.GetUsage)
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0, // WriteTimeout 0 allows long-lived SSE streaming connections
		IdleTimeout:  120 * time.Second,
	}

	// Start server in goroutine
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			middleware.Logger.Error("Server error", "err", err.Error())
			os.Exit(1)
		}
	}()

	middleware.Logger.Info("MasterChat API Gateway is ready and listening", "addr", srv.Addr)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	middleware.Logger.Info("Shutting down API Gateway...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		middleware.Logger.Error("Server forced to shutdown", "err", err.Error())
	}

	middleware.Logger.Info("API Gateway shutdown complete")
}
