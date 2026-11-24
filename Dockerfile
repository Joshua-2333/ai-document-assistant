# Use Node.js 22 with Debian Linux
FROM node:22-bookworm-slim

# Install Python and virtual environment support
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set the application working directory
WORKDIR /app

# Copy Node.js workspace dependency files
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install Node.js dependencies
RUN npm ci --include=dev

# Copy Python dependencies
COPY mcp-server/requirements.txt ./mcp-server/

# Create the Python virtual environment
RUN python3 -m venv /app/mcp-server/.venv

# Install Python dependencies
RUN /app/mcp-server/.venv/bin/python -m pip install \
    --no-cache-dir \
    -r /app/mcp-server/requirements.txt

# Copy application source code
COPY . .

# Configure the production AI display name
ARG VITE_AI_DISPLAY_NAME="Claude Haiku 5.5"
ENV VITE_AI_DISPLAY_NAME=${VITE_AI_DISPLAY_NAME}

# Build the React frontend
RUN npm run build --workspace=client

# Remove unnecessary development dependencies
RUN npm prune --omit=dev

# Create the private document storage directory
RUN mkdir -p /app/mcp-server/documents

# Give the non-root user ownership of document storage
RUN chown node:node /app/mcp-server/documents

# Configure the production environment
ENV NODE_ENV=production
ENV PORT=10000

# Run the application as a non-root user
USER node

# Expose the application port
EXPOSE 10000

# Start the Express server
WORKDIR /app/server

CMD ["node", "src/index.js"]