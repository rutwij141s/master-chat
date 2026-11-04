package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/proxy"
)

type ChatHandler struct {
	cfg *config.Config
}

func NewChatHandler(cfg *config.Config) *ChatHandler {
	return &ChatHandler{cfg: cfg}
}

func (h *ChatHandler) StreamChat(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/chat/stream", h.cfg.AIServiceURL)
	proxy.StreamProxySSE(c, targetURL)
}
