package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/proxy"
)

type MediaHandler struct {
	cfg *config.Config
}

func NewMediaHandler(cfg *config.Config) *MediaHandler {
	return &MediaHandler{cfg: cfg}
}

func (h *MediaHandler) TranscribeAudio(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/audio/transcribe", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}

func (h *MediaHandler) TextToSpeech(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/audio/speech", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}
