package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port                   string
	AIServiceURL           string
	DatabaseURL            string
	RedisURL               string
	JWTSecret              string
	JWTAccessExpiry        time.Duration
	JWTRefreshExpiry       time.Duration
	RateLimitRequestsPerMin int
	Environment            string
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func LoadConfig() *Config {
	accessMinutes, _ := strconv.Atoi(getEnv("JWT_EXPIRES_IN_MINUTES", "60"))
	refreshDays, _ := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRES_IN_DAYS", "7"))
	rateLimit, _ := strconv.Atoi(getEnv("RATE_LIMIT_PER_MINUTE", "60"))

	return &Config{
		Port:                   getEnv("GATEWAY_PORT", "8080"),
		AIServiceURL:           getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgresql://masterchat:masterchat_secure_pass@localhost:5432/masterchat_db?sslmode=disable"),
		RedisURL:               getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:              getEnv("JWT_SECRET", "super_secret_jwt_encryption_key_change_in_production_32chars!"),
		JWTAccessExpiry:        time.Duration(accessMinutes) * time.Minute,
		JWTRefreshExpiry:       time.Duration(refreshDays) * 24 * time.Hour,
		RateLimitRequestsPerMin: rateLimit,
		Environment:            getEnv("ENVIRONMENT", "development"),
	}
}
