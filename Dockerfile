FROM node:20.19.0-alpine3.20

RUN apk add --no-cache ffmpeg

RUN apk --no-cache add findutils && \
    rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

RUN rm -rf node_modules

RUN npm install yarn

COPY . .

# If you are building your code for production
# RUN npm ci --only=production
RUN yarn install

# Bundle app source

EXPOSE 8080

CMD yarn run start