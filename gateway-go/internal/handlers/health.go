package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/db"
	"github.com/masterchat/gateway/internal/redis"
)

type HealthHandler struct {
	db  *db.DB
	rdb *redis.Client
}

func NewHealthHandler(db *db.DB, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{db: db, rdb: rdb}
}

func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "gateway-go",
		"version": "1.0.0",
	})
}

func (h *HealthHandler) Ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	dbErr := h.db.Ping()
	redisErr := h.rdb.Ping(ctx)

	isReady := dbErr == nil && redisErr == nil

	status := http.StatusOK
	if !isReady {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, gin.H{
		"ready":    isReady,
		"database": dbErr == nil,
		"redis":    redisErr == nil,
	})
}
