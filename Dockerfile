FROM node:8
WORKDIR /workspace
COPY . .
RUN npm install
CMD npm start
EXPOSE 3002
