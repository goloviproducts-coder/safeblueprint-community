# nginx 1.31.7-alpine (pinned by digest)
FROM nginx:1.31.8-alpine@sha256:fed7e14be83cbd2661a75cdc5b872d936cf155d46c327084d30b8df19ae88d72
RUN rm -rf /usr/share/nginx/html/* && mkdir -p /tmp && chown -R nginx:nginx /var/cache/nginx /tmp
COPY nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx site/ /usr/share/nginx/html/
USER nginx
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
