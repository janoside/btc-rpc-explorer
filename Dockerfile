FROM node:11
WORKDIR /workspace
COPY . .
RUN apt-get update && apt-get install -y netcat-traditional
RUN npm install
CMD npm start
EXPOSE 3002
