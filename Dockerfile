FROM node:alpine
WORKDIR /workspace
COPY . .

RUN apk update && \
    apk add --no-cache git python make && \
    npm install

CMD npm start
EXPOSE 3002
