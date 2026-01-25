## Terraform (Local-Focused IaC)

Terraform in this project is intentionally lightweight and focused on **learning and signalling** rather than full cloud deployment.

Planned usage:
- Model the Kafka topic `sensor_metrics` and its partitioning.
- Model the Postgres database used by the consumer.
- Optionally mirror how these resources would look on a cloud provider (e.g., AWS) without requiring an actual cloud account to run.

If time is short, keep this as documentation plus minimal `.tf` stubs rather than a fully functional cloud deployment.

