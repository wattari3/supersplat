# SuperSplat Dockerfile - 3D Gaussian Splat viewer

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose serve port
EXPOSE 3000

# Serve the built application
CMD ["npm", "run", "serve"]
