# syntax=docker/dockerfile:1

# ─── build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# package*.json primero para cachear "npm ci" mientras no cambien las deps.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# "npm run build" ya corre "tsc --noEmit" antes de "vite build".
RUN npm run build

# ─── runtime ─────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
