# Production Dockerfile for Smart Campus Facility Booking System (CampusBook)
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev || npm install --omit=dev

COPY . ./

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
