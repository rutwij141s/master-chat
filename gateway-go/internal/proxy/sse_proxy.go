package proxy

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var httpClient = &http.Client{
	Timeout: 0, // No global timeout for long-lived SSE streaming
}

// StreamProxySSE proxies an SSE request to the upstream AI service without buffering
func StreamProxySSE(c *gin.Context, targetURL string) {
	reqID, _ := c.Get("requestID")
	userID, _ := c.Get("userID")
	email, _ := c.Get("email")

	// Create request with client context so disconnects cancel upstream
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	proxyReq, err := http.NewRequestWithContext(ctx, c.Request.Method, targetURL, c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request", "message": err.Error()})
		return
	}

	// Propagate required headers
	proxyReq.Header.Set("Content-Type", c.GetHeader("Content-Type"))
	if proxyReq.Header.Get("Content-Type") == "" {
		proxyReq.Header.Set("Content-Type", "application/json")
	}
	proxyReq.Header.Set("Accept", "text/event-stream")
	if reqID != nil {
		proxyReq.Header.Set("X-Request-Id", fmt.Sprintf("%v", reqID))
	}
	if userID != nil {
		proxyReq.Header.Set("X-User-Id", fmt.Sprintf("%v", userID))
	}
	if email != nil {
		proxyReq.Header.Set("X-User-Email", fmt.Sprintf("%v", email))
	}

	resp, err := httpClient.Do(proxyReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI service unavailable", "message": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), bodyBytes)
		return
	}

	// Prepare SSE response headers for the client
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Flush()

	// Stream chunks immediately to client with no buffering
	buf := make([]byte, 1024)
	for {
		select {
		case <-ctx.Done():
			return
		default:
			n, readErr := resp.Body.Read(buf)
			if n > 0 {
				_, writeErr := c.Writer.Write(buf[:n])
				if writeErr != nil {
					return
				}
				c.Writer.Flush()
			}
			if readErr != nil {
				if readErr == io.EOF {
					return
				}
				return
			}
		}
	}
}

// ProxyJSON proxies standard JSON requests (GET, POST, DELETE) to upstream
func ProxyJSON(c *gin.Context, targetURL string) {
	reqID, _ := c.Get("requestID")
	userID, _ := c.Get("userID")
	email, _ := c.Get("email")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	proxyReq, err := http.NewRequestWithContext(ctx, c.Request.Method, targetURL, c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}

	// Copy headers
	for k, vv := range c.Request.Header {
		for _, v := range vv {
			proxyReq.Header.Add(k, v)
		}
	}

	if reqID != nil {
		proxyReq.Header.Set("X-Request-Id", fmt.Sprintf("%v", reqID))
	}
	if userID != nil {
		proxyReq.Header.Set("X-User-Id", fmt.Sprintf("%v", userID))
	}
	if email != nil {
		proxyReq.Header.Set("X-User-Email", fmt.Sprintf("%v", email))
	}

	resp, err := httpClient.Do(proxyReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI service unavailable", "message": err.Error()})
		return
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read upstream response"})
		return
	}

	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), bodyBytes)
}
