package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/proxy"
)

type ModelHandler struct {
	cfg *config.Config
}

func NewModelHandler(cfg *config.Config) *ModelHandler {
	return &ModelHandler{cfg: cfg}
}

func (h *ModelHandler) ListModels(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/models", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}
