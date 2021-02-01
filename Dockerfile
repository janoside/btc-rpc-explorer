FROM node:8 as builder
WORKDIR /workspace
COPY . .
RUN npm install

FROM node:8-alpine
WORKDIR /workspace
COPY --from=builder /workspace .
RUN apk --update add git
CMD npm start
EXPOSE 3002
