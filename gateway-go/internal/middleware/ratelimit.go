package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/redis"
)

func RateLimitMiddleware(rdb *redis.Client, requestsPerMinute int) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		if userID, exists := c.Get("userID"); exists && userID != "" {
			key = fmt.Sprintf("user:%v", userID)
		}

		allowed, remaining, err := rdb.AllowCheck(c.Request.Context(), key, requestsPerMinute, time.Minute)
		if err != nil {
			// Fail open on unexpected error, log and continue
			Logger.Warn("Rate limit check error", "error", err.Error())
		}

		c.Writer.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", requestsPerMinute))
		c.Writer.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		if !allowed {
			c.Writer.Header().Set("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "TooManyRequests",
				"message":     "Rate limit exceeded. Please wait before making more requests.",
				"retry_after": 60,
			})
			return
		}

		c.Next()
	}
}
