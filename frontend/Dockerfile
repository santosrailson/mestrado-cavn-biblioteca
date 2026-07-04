# =============================================================================
# Dockerfile — Frontend React do Repositório Digital CAVN
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api/v1
ARG VITE_SITE_URL=http://localhost
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SITE_URL=${VITE_SITE_URL}

COPY package.json package-lock.json* ./
RUN npm ci

ENV NODE_ENV=production

COPY . .
RUN npm run build

# =============================================================================
# Estágio de produção com Nginx
# =============================================================================
FROM nginx:1.31-alpine

RUN sed -i 's/user  nginx;/# user  nginx;/' /etc/nginx/nginx.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid /var/cache/nginx

EXPOSE 80

USER nginx
CMD ["nginx", "-g", "daemon off;"]
