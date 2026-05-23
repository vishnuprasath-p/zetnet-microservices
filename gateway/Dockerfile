FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json .
COPY package-lock.json* .

# Copy shared library
COPY shared ./shared

# Copy gateway
COPY gateway ./gateway

# Install dependencies
RUN npm ci --workspace=shared --workspace=gateway

# Build shared library and gateway
RUN npm run build --workspace=shared
RUN npm run build --workspace=gateway

EXPOSE 3000

CMD ["npm", "start", "--workspace=gateway"]
