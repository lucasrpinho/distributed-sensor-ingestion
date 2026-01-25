package main

import (
	"fmt"
	"os"
)

// Config holds all configuration for the producer.
type Config struct {
	KafkaBrokers   string
	KafkaTopic     string
	SensorCount    int
	EventsPerSec   int
	RunDurationSec int
}

// LoadConfig loads configuration from environment variables and command-line flags.
func LoadConfig() (*Config, error) {
	cfg := &Config{}

	// Defaults
	cfg.KafkaBrokers = getEnv("KAFKA_BROKERS", "localhost:9092")
	cfg.KafkaTopic = getEnv("KAFKA_TOPIC", "sensor_metrics")
	cfg.SensorCount = getEnvInt("SENSOR_COUNT", 1000)
	cfg.EventsPerSec = getEnvInt("EVENTS_PER_SEC", 5000)
	cfg.RunDurationSec = getEnvInt("RUN_DURATION_SEC", 0) // 0 to run indefinitely

	// Validation
	if cfg.SensorCount <= 0 {
		return nil, fmt.Errorf("sensor count must be > 0")
	}
	if cfg.EventsPerSec <= 0 {
		return nil, fmt.Errorf("events per second must be > 0")
	}
	if cfg.KafkaBrokers == "" {
		return nil, fmt.Errorf("Kafka brokers must be specified")
	}
	if cfg.KafkaTopic == "" {
		return nil, fmt.Errorf("Kafka topic must be specified")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		var result int
		if _, err := fmt.Sscanf(value, "%d", &result); err == nil {
			return result
		}
	}
	return defaultValue
}
