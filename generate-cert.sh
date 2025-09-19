#!/bin/sh
# Generate a self-signed certificate for localhost development
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout key.pem -out cert.pem \
  -subj "/CN=localhost"
