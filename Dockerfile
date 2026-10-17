FROM node:20-alpine

WORKDIR /app

# Create /workspace symlink pointing to /app for Dev Container CLI compatibility
RUN ln -s /app /workspace

# Install dependencies
COPY package.json ./
RUN npm install

# Copy application source
COPY . .

# Ensure data and avatar directories exist
RUN mkdir -p /app/data /app/public/avatars

# Build Next.js for production (Railway deployment)
RUN npm run build

EXPOSE 2010

ENV NODE_ENV=production
ENV PORT=2010
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]
