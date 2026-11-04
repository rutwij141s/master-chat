package redis

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type Client struct {
	rdb       *goredis.Client
	isMock    bool
	mockMu    sync.Mutex
	mockHits  map[string][]time.Time
}

func ConnectRedis(redisURL string) *Client {
	opt, err := goredis.ParseURL(redisURL)
	if err != nil {
		return newMockClient()
	}

	rdb := goredis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return newMockClient()
	}

	return &Client{
		rdb:      rdb,
		isMock:   false,
		mockHits: make(map[string][]time.Time),
	}
}

func newMockClient() *Client {
	return &Client{
		isMock:   true,
		mockHits: make(map[string][]time.Time),
	}
}

func (c *Client) Ping(ctx context.Context) error {
	if c.isMock {
		return nil
	}
	return c.rdb.Ping(ctx).Err()
}

// AllowCheck checks if an action for a given key is within the rate limit (sliding window)
func (c *Client) AllowCheck(ctx context.Context, key string, limit int, window time.Duration) (bool, int, error) {
	if c.isMock {
		c.mockMu.Lock()
		defer c.mockMu.Unlock()

		now := time.Now()
		cutoff := now.Add(-window)

		// Filter older hits
		hits := c.mockHits[key]
		var valid []time.Time
		for _, t := range hits {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}

		if len(valid) >= limit {
			c.mockHits[key] = valid
			return false, 0, nil
		}

		valid = append(valid, now)
		c.mockHits[key] = valid
		remaining := limit - len(valid)
		return true, remaining, nil
	}

	now := time.Now().UnixNano()
	windowNano := window.Nanoseconds()
	clearBefore := now - windowNano
	redisKey := fmt.Sprintf("ratelimit:%s", key)

	pipe := c.rdb.TxPipeline()
	pipe.ZRemRangeByScore(ctx, redisKey, "0", strconv.FormatInt(clearBefore, 10))
	pipe.ZAdd(ctx, redisKey, goredis.Z{Score: float64(now), Member: strconv.FormatInt(now, 10)})
	countCmd := pipe.ZCard(ctx, redisKey)
	pipe.Expire(ctx, redisKey, window*2)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return true, limit - 1, err // Fail open on Redis error
	}

	count := int(countCmd.Val())
	if count > limit {
		return false, 0, nil
	}

	return true, limit - count, nil
}
