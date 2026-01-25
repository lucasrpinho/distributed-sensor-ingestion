package main

import (
	"context"
	"math/rand"
	"time"
)

// SensorSimulator simulates a single sensor emitting events at a given rate.
type SensorSimulator struct {
	sensorID      string
	eventsPerSec  float64
	producer      *Producer
	baseValue     float64 // Base value for this sensor
	valueDrift    float64 // Random walk drift
	rng           *rand.Rand // Per-sensor random number generator
}

// NewSensorSimulator creates a new sensor simulator.
func NewSensorSimulator(sensorID string, eventsPerSec float64, producer *Producer) *SensorSimulator {
	// Each sensor has a unique base value and drift pattern
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	return &SensorSimulator{
		sensorID:     sensorID,
		eventsPerSec: eventsPerSec,
		producer:     producer,
		baseValue:    20 + rng.Float64()*80, // Random base between 20-100
		valueDrift:   (rng.Float64() - 0.5) * 0.1, // Small random drift
		rng:          rng,
	}
}

// Run starts emitting events for this sensor until the context is cancelled.
func (s *SensorSimulator) Run(ctx context.Context) {
	interval := time.Duration(float64(time.Second) / s.eventsPerSec)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Generate a metric value with small random variation
			value := s.baseValue + (s.rng.Float64()-0.5)*2.0
			s.baseValue += s.valueDrift // Slow drift over time

			event := NewSensorEvent(s.sensorID, value)
			if err := s.producer.SendEvent(event); err != nil {
				// Log but continue - backpressure is handled by producer
				// In a real system, you might want to buffer or retry here
			}
		}
	}
}
