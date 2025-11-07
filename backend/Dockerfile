FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --production

# Bundle app source
COPY . /app

# Expose port
EXPOSE 3001

# Use environment variable for node environment
ENV NODE_ENV=production

# Start the API proxy
CMD ["node", "api-proxy.js"]
