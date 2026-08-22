FROM node:22-alpine

WORKDIR /app

COPY database ./database
COPY backend ./backend

WORKDIR /app/database
RUN npm install

WORKDIR /app/backend
RUN npm install
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
