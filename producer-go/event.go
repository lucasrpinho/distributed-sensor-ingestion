package main

import (
	"encoding/json"
	"time"
)

// SensorEvent represents a sensor reading event.
type SensorEvent struct {
	SensorID  string  `json:"sensor_id"`
	EventID   string `json:"event_id"`
	Timestamp string `json:"timestamp"` // ISO 8601 format
	Value     float64 `json:"value"`
}

// NewSensorEvent creates a new sensor event with a unique event_id.
func NewSensorEvent(sensorID string, value float64) *SensorEvent {
	return &SensorEvent{
		SensorID:  sensorID,
		EventID:   generateEventID(),
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Value:     value,
	}
}

// ToJSON marshals the event to JSON bytes.
func (e *SensorEvent) ToJSON() ([]byte, error) {
	return json.Marshal(e)
}
