FROM node:20.18.0-slim AS builder

WORKDIR /app

ENV NODE_EXTRA_CA_CERTS="combined-certs.pem"

COPY package*.json ./

COPY . .
RUN npm install 
RUN apt-get update
RUN apt-get install dumb-init
CMD ["dumb-init", "npm", "start"]

FROM node:20.18.0-slim AS production

WORKDIR /app


ENV TZ=America/Sao_Paulo

COPY --chown=node:node --from=builder /app .

ENV NODE_EXTRA_CA_CERTS="combined-certs.pem"

COPY --chown=node:node . .

COPY --chown=node:node --from=builder /usr/bin/dumb-init /usr/bin/dumb-init

USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "index.js"]