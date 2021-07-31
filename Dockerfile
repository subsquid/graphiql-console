FROM node:14-alpine AS asset-builder
WORKDIR /app
ADD package.json .
ADD package-lock.json .
RUN npm ci
ADD public public
ADD src src
RUN npm run build
ENTRYPOINT ["/bin/sh"]


FROM nginx:stable-alpine AS console
COPY --from=asset-builder /app/build /usr/share/nginx/html
COPY --from=asset-builder /app/build/index.html /etc/nginx/templates/index.html.template
ENV NGINX_ENVSUBST_OUTPUT_DIR /usr/share/nginx/html