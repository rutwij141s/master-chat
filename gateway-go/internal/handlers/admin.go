package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/proxy"
)

type AdminHandler struct {
	cfg *config.Config
}

func NewAdminHandler(cfg *config.Config) *AdminHandler {
	return &AdminHandler{cfg: cfg}
}

func (h *AdminHandler) GetOverview(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/admin/overview", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/admin/users", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}

func (h *AdminHandler) GetUserDetail(c *gin.Context) {
	id := c.Param("id")
	targetURL := fmt.Sprintf("%s/api/v1/admin/users/%s", h.cfg.AIServiceURL, id)
	proxy.ProxyJSON(c, targetURL)
}

func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	id := c.Param("id")
	targetURL := fmt.Sprintf("%s/api/v1/admin/users/%s/role", h.cfg.AIServiceURL, id)
	proxy.ProxyJSON(c, targetURL)
}

func (h *AdminHandler) VerifyEvaluation(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/eval/verify", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}

func (h *AdminHandler) RunEvaluationBenchmark(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/eval/benchmark", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}
