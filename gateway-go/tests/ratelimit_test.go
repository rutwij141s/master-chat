package tests

import (
	"context"
	"testing"
	"time"

	"github.com/masterchat/gateway/internal/redis"
)

func TestRateLimiter(t *testing.T) {
	client := redis.ConnectRedis("redis://invalid-host-to-force-mock:6379/0")
	ctx := context.Background()

	key := "test-user-limit"
	limit := 3
	window := 2 * time.Second

	// Hit 1
	allowed, remaining, err := client.AllowCheck(ctx, key, limit, window)
	if err != nil || !allowed || remaining != 2 {
		t.Fatalf("Hit 1 failed: allowed=%v, remaining=%d, err=%v", allowed, remaining, err)
	}

	// Hit 2
	allowed, remaining, err = client.AllowCheck(ctx, key, limit, window)
	if err != nil || !allowed || remaining != 1 {
		t.Fatalf("Hit 2 failed: allowed=%v, remaining=%d, err=%v", allowed, remaining, err)
	}

	// Hit 3
	allowed, remaining, err = client.AllowCheck(ctx, key, limit, window)
	if err != nil || !allowed || remaining != 0 {
		t.Fatalf("Hit 3 failed: allowed=%v, remaining=%d, err=%v", allowed, remaining, err)
	}

	// Hit 4 (should be blocked)
	allowed, remaining, err = client.AllowCheck(ctx, key, limit, window)
	if allowed {
		t.Fatalf("Hit 4 should have been blocked, but was allowed")
	}
}
