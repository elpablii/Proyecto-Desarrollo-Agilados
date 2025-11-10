FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./

# [CORREGIDO] Se agrega '\' al final de la línea para unirla con la siguiente
RUN npm ci --only=production || \
    npm install --production

# Bundle app source
# Copiamos la nueva estructura de carpetas
COPY . /app

# Expose port
EXPOSE 3001

# Use environment variable for node environment
ENV NODE_ENV=production

# Start the API (actualizado a index.js)
CMD ["node", "index.js"]