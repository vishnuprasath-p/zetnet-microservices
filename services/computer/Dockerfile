FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json* .
COPY shared ./shared
COPY services/computer ./services/computer

RUN npm ci --workspace=shared --workspace=services/computer
RUN npm run build --workspace=shared
RUN npm run build --workspace=services/computer

EXPOSE 3002

CMD ["npm", "start", "--workspace=services/computer"]
