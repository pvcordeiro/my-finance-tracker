#!/bin/bash

# Create certs directory
mkdir -p certs

# Generate SSL certificate for external access
openssl req -x509 -newkey rsa:4096 -keyout certs/private-key.pem -out certs/certificate.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"

echo "SSL certificates generated in certs/ directory"
echo "Replace 'your-domain.com' with your actual domain or use your external IP"
