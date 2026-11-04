package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/proxy"
)

type UsageHandler struct {
	cfg *config.Config
}

func NewUsageHandler(cfg *config.Config) *UsageHandler {
	return &UsageHandler{cfg: cfg}
}

func (h *UsageHandler) GetUsage(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/usage", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}
