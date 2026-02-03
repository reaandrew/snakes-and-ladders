package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds the application configuration loaded from environment variables.
type Config struct {
	Port           int
	AllowedOrigins []string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			port = parsed
		}
	}

	allowedOrigins := []string{"https://snakes.techar.ch"}
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		allowedOrigins = strings.Split(origins, ",")
		for i, o := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(o)
		}
	}

	return &Config{
		Port:           port,
		AllowedOrigins: allowedOrigins,
	}
}

// IsOriginAllowed checks if the given origin is in the allowed list.
func (c *Config) IsOriginAllowed(origin string) bool {
	for _, allowed := range c.AllowedOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
	}
	return false
}
