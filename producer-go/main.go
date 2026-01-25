package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
)

func main() {
	cfg, err := LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("Starting sensor producer")
	log.Printf("  Kafka brokers: %s", cfg.KafkaBrokers)
	log.Printf("  Topic: %s", cfg.KafkaTopic)
	log.Printf("  Sensors: %d", cfg.SensorCount)
	log.Printf("  Target rate: %d events/sec", cfg.EventsPerSec)
	log.Printf("  Duration: %d seconds (0 = infinite)", cfg.RunDurationSec)

	brokers := strings.Split(cfg.KafkaBrokers, ",")
	for i := range brokers {
		brokers[i] = strings.TrimSpace(brokers[i])
	}

	// Create Kafka producer
	producer, err := NewProducer(brokers, cfg.KafkaTopic)
	if err != nil {
		log.Fatalf("Failed to create producer: %v", err)
	}
	defer producer.Close()

	// Calculate events per second per sensor
	eventsPerSecPerSensor := float64(cfg.EventsPerSec) / float64(cfg.SensorCount)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Start all sensor simulators
	var wg sync.WaitGroup
	for i := 0; i < cfg.SensorCount; i++ {
		sensorID := fmt.Sprintf("sensor_%d", i+1)
		simulator := NewSensorSimulator(sensorID, eventsPerSecPerSensor, producer)
		wg.Add(1)
		go func() {
			defer wg.Done()
			simulator.Run(ctx)
		}()
	}

	// If duration is set, cancel context after duration
	if cfg.RunDurationSec > 0 {
		go func() {
			time.Sleep(time.Duration(cfg.RunDurationSec) * time.Second)
			log.Printf("Run duration reached, shutting down...")
			cancel()
		}()
	}

	// Print stats periodically
	statsTicker := time.NewTicker(5 * time.Second)
	defer statsTicker.Stop()
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-statsTicker.C:
				success, errors := producer.Stats()
				log.Printf("Stats: %d sent, %d errors", success, errors)
			}
		}
	}()

	// Wait for shutdown signal or context cancellation
	select {
	case sig := <-sigChan:
		log.Printf("Received signal: %v, shutting down...", sig)
		cancel()
	case <-ctx.Done():
		log.Printf("Context cancelled, shutting down...")
	}

	log.Printf("Waiting for sensors to stop...")
	wg.Wait()

	success, errors := producer.Stats()
	log.Printf("Final stats: %d sent, %d errors", success, errors)
}

func generateEventID() string {
	return uuid.New().String()
}
