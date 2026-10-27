# Deploys APEX LIFT (apex-lift/). Railway/Render pick this up automatically.
FROM node:22-alpine
WORKDIR /app
COPY apex-lift/package.json apex-lift/package-lock.json ./
RUN npm ci --omit=dev
COPY apex-lift/ ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
