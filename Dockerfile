FROM node:24 AS base

# Create app directory
RUN mkdir -p /opt/app
WORKDIR /opt/app

# Install app dependencies
COPY ./package.json package-lock.json ./
RUN npm install

# Bundle frontend
COPY src ./src
COPY assets ./assets
COPY config ./config
RUN npm run build

#####################
# Final image
#####################

FROM node:24-alpine
ENV NODE_ENV=prod

LABEL maintainer="cracker0dks"

# Create app directory
RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY ./package.json ./package-lock.json config.default.yml ./
RUN npm install --only=prod --ignore-scripts

COPY scripts ./scripts
COPY --from=base /opt/app/dist ./dist

EXPOSE 8080
ENTRYPOINT ["npm", "run", "start"]