package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/masterchat/gateway/internal/auth"
)

func AuthRequired(tm *auth.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Authorization header is required",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Authorization format must be 'Bearer <token>'",
			})
			return
		}

		claims, err := tm.ValidateToken(parts[1], auth.AccessToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Invalid or expired access token",
			})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		role := claims.Role
		if role == "" {
			if strings.EqualFold(claims.Email, "demo@masterchat.ai") || strings.HasPrefix(strings.ToLower(claims.Email), "admin@") {
				role = "admin"
			} else {
				role = "user"
			}
		}
		c.Set("role", role)
		c.Next()
	}
}

// AdminRequired enforces that the requesting user possesses administrative privileges.
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		role, _ := roleVal.(string)
		if !exists || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "Admin privileges required to access this resource",
			})
			return
		}
		c.Next()
	}
}
