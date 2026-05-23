FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json* .
COPY shared ./shared
COPY services/solutions ./services/solutions

RUN npm ci --workspace=shared --workspace=services/solutions
RUN npm run build --workspace=shared
RUN npm run build --workspace=services/solutions

EXPOSE 3004

CMD ["npm", "start", "--workspace=services/solutions"]
