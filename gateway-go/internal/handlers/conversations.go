package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/config"
	"github.com/masterchat/gateway/internal/proxy"
)

type ConversationHandler struct {
	cfg *config.Config
}

func NewConversationHandler(cfg *config.Config) *ConversationHandler {
	return &ConversationHandler{cfg: cfg}
}

func (h *ConversationHandler) ListConversations(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/conversations", h.cfg.AIServiceURL)
	if c.Request.URL.RawQuery != "" {
		targetURL = targetURL + "?" + c.Request.URL.RawQuery
	}
	proxy.ProxyJSON(c, targetURL)
}

func (h *ConversationHandler) CreateConversation(c *gin.Context) {
	targetURL := fmt.Sprintf("%s/api/v1/conversations", h.cfg.AIServiceURL)
	proxy.ProxyJSON(c, targetURL)
}

func (h *ConversationHandler) DeleteConversation(c *gin.Context) {
	id := c.Param("id")
	targetURL := fmt.Sprintf("%s/api/v1/conversations/%s", h.cfg.AIServiceURL, id)
	proxy.ProxyJSON(c, targetURL)
}

func (h *ConversationHandler) GetMessages(c *gin.Context) {
	id := c.Param("id")
	targetURL := fmt.Sprintf("%s/api/v1/conversations/%s/messages", h.cfg.AIServiceURL, id)
	proxy.ProxyJSON(c, targetURL)
}
