# 1단계: Vite 빌드 (VITE_ 환경변수는 빌드 시점에 주입됨)
FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# 브라우저가 호출할 API/WS 베이스 URL(빌드 타임 고정). compose 의 build.args 로 주입.
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# 2단계: 정적 파일 서빙 (nginx, SPA 폴백)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
