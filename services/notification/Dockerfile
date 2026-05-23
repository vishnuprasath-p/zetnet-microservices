FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json* .
COPY shared ./shared
COPY services/notification ./services/notification

RUN npm ci --workspace=shared --workspace=services/notification
RUN npm run build --workspace=shared
RUN npm run build --workspace=services/notification

EXPOSE 3006

CMD ["npm", "start", "--workspace=services/notification"]
