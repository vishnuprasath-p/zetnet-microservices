FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json* .
COPY shared ./shared
COPY services/enquiry ./services/enquiry

RUN npm ci --workspace=shared --workspace=services/enquiry
RUN npm run build --workspace=shared
RUN npm run build --workspace=services/enquiry

EXPOSE 3005

CMD ["npm", "start", "--workspace=services/enquiry"]
