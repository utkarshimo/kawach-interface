
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY main.js ./
COPY index.html ./

ENV NODE_ENV=production
ENV PORT=5123

EXPOSE 5123

CMD ["node", "main.js"]
