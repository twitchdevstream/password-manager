FROM node:20-slim

WORKDIR /app

# Install PostgreSQL client for health check and add support for different architectures
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    npm install -g node-gyp && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Install esbuild with platform specific settings
RUN npm install esbuild@latest

# Build the application
RUN npm run build

# Add wait-for-it script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5000

CMD ["docker-entrypoint.sh"]