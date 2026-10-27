# Runs the site on any host, including old Ubuntu servers whose system Node/glibc are too old.
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# install dependencies first so rebuilds are fast when only code changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# data/ (SQLite) and public/uploads/ are mounted from the host so they survive rebuilds
RUN mkdir -p data public/uploads && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/app.js"]
