package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/proxy"
)

type DocumentHandler struct {
	cfg *config.Config
}

func NewDocumentHandler(cfg *config.Config) *DocumentHandler {
	return &DocumentHandler{cfg: cfg}
}

func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/documents/upload", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}

func (h *DocumentHandler) ListDocuments(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/documents", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}

func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	id := c.Param("id")
	targetURL := fmt.Sprintf("%s/api/v1/documents/%s", h.cfg.AIServiceURL, id)
	proxy.ProxyJSON(c, targetURL)
}
