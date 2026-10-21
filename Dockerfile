FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/* && mkdir -p /tmp && chown -R nginx:nginx /var/cache/nginx /tmp
COPY nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx site/ /usr/share/nginx/html/
USER nginx
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
