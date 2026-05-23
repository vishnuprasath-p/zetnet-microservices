FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json* .
COPY shared ./shared
COPY services/travel ./services/travel

RUN npm ci --workspace=shared --workspace=services/travel
RUN npm run build --workspace=shared
RUN npm run build --workspace=services/travel

EXPOSE 3003

CMD ["npm", "start", "--workspace=services/travel"]
