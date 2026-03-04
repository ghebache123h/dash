FROM node:20-alpine AS deps
WORKDIR /app
COPY analytics/dashboard_next/package.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY analytics/dashboard_next ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8501
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app ./
EXPOSE 8501
CMD ["node", ".next/standalone/server.js"]
