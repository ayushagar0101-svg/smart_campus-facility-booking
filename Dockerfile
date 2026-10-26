# Production Dockerfile for Smart Campus Facility Booking System (CampusBook)
# Node.js 20 Alpine for minimal footprint and maximum security
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Production environment
ENV NODE_ENV=production

# Copy package manifests from the project subdirectory
COPY Smart_campus_facility_booking/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application files into the runtime directory
COPY Smart_campus_facility_booking/ ./

# Expose default port (Railway provides PORT dynamically at runtime)
ENV PORT=3000
EXPOSE 3000

# Start production server
CMD ["node", "server.js"]
