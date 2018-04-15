FROM node:8
WORKDIR /opt/rpcexp
COPY package*.json ./
RUN npm install
COPY . .
CMD npm start
EXPOSE 3002
