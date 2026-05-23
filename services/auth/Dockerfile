FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json .
COPY package-lock.json* .

# Copy shared library
COPY shared ./shared

# Copy auth service
COPY services/auth ./services/auth

# Install dependencies
RUN npm ci --workspace=shared --workspace=services/auth

# Build shared library and service
RUN npm run build --workspace=shared
RUN npm run build --workspace=services/auth

EXPOSE 3001

CMD ["npm", "start", "--workspace=services/auth"]
