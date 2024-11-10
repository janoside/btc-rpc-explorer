FROM node:20 as builder
WORKDIR /workspace
COPY . .
RUN npm install

FROM node:20-alpine
WORKDIR /workspace
COPY --from=builder /workspace .
RUN apk --update add git
CMD npm start
EXPOSE 3002
