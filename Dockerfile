FROM node:24-bookworm-slim AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

FROM nginx:stable-alpine

COPY --from=builder /build/dist /usr/share/nginx/html
RUN chmod -R a+rX /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

ENV API_UPSTREAM=http://api:8090

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
