# Team CalTalk 백엔드 (Node 20). bcrypt 등 네이티브 모듈 호환을 위해 full 이미지 사용.
FROM node:20-bookworm

WORKDIR /app

# 의존성 먼저 설치(레이어 캐시). node-pg-migrate(devDependency)를 컨테이너에서 사용하므로 dev 포함 설치.
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# 마이그레이션 적용 후 서버 기동. DATABASE_URL 등은 compose 환경변수로 주입.
CMD ["sh", "-c", "npx node-pg-migrate up -m src/db/migrations && node src/server.js"]
