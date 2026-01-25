package main

import (
	"fmt"
	"log"
	"sync/atomic"

	"github.com/IBM/sarama"
)

// Producer wraps a Sarama async producer with backpressure handling.
type Producer struct {
	producer sarama.AsyncProducer
	topic    string
	success  int64
	errors   int64
}

// NewProducer creates a new Kafka producer with backpressure configuration.
func NewProducer(brokers []string, topic string) (*Producer, error) {
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true
	config.Producer.Return.Errors = true
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 5
	config.Producer.Retry.Backoff = 100
	config.Producer.Compression = sarama.CompressionNone
	config.Producer.Flush.Messages = 100
	config.Producer.Flush.Frequency = 100 // ms
	config.Producer.MaxMessageBytes = 1000000

	// Enable idempotent producer (prevents duplicates on retries)
	config.Producer.Idempotent = true
	config.Net.MaxOpenRequests = 1

	producer, err := sarama.NewAsyncProducer(brokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create producer: %w", err)
	}

	p := &Producer{
		producer: producer,
		topic:    topic,
	}

	// Start goroutines to handle success/error callbacks
	go p.handleSuccesses()
	go p.handleErrors()

	return p, nil
}

// SendEvent sends a sensor event to Kafka asynchronously.
// The sensor_id is used as the partition key to ensure per-sensor ordering.
func (p *Producer) SendEvent(event *SensorEvent) error {
	payload, err := event.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	msg := &sarama.ProducerMessage{
		Topic: p.topic,
		Key:   sarama.StringEncoder(event.SensorID), // Partition key = sensor_id
		Value: sarama.ByteEncoder(payload),
	}

	select {
	case p.producer.Input() <- msg:
		return nil
	default:
		// Producer channel is full (backpressure)
		return fmt.Errorf("producer buffer full, message dropped")
	}
}

func (p *Producer) handleSuccesses() {
	for range p.producer.Successes() {
		atomic.AddInt64(&p.success, 1)
	}
}

func (p *Producer) handleErrors() {
	for err := range p.producer.Errors() {
		atomic.AddInt64(&p.errors, 1)
		log.Printf("ERROR: failed to send message: %v (key: %s)", err.Err, err.Msg.Key)
	}
}

// Stats returns the number of successful and failed message sends.
func (p *Producer) Stats() (success int64, errors int64) {
	return atomic.LoadInt64(&p.success), atomic.LoadInt64(&p.errors)
}

// Close shuts down the producer gracefully.
func (p *Producer) Close() error {
	return p.producer.Close()
}
