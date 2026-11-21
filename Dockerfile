FROM node:22-slim

WORKDIR /app

COPY index.html app.js local.js sw.js styles.css content.json server.js ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
