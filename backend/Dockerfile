FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN npm run build

EXPOSE 4001

CMD ["node", "dist/main"]
