# SuperSplat Dockerfile - 3D Gaussian Splat viewer
# Multi-stage build: build stage creates dist, runtime stage serves it

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install serve package globally
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist /app/dist

# Also copy to shared volume location for backend
# This will be overwritten by entrypoint script
RUN mkdir -p /shared/supersplat_dist

# Copy entrypoint script
COPY <<EOF /entrypoint.sh
#!/bin/sh
# Copy built files to shared volume
cp -r /app/dist/* /shared/supersplat_dist/
# Start serve
exec serve /app/dist -l 3000 -C
EOF

RUN chmod +x /entrypoint.sh

# Expose serve port
EXPOSE 3000

# Use entrypoint to copy files and start server
CMD ["/entrypoint.sh"]
