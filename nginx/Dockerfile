FROM nginx:alpine

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY nginx.conf.http /etc/nginx/nginx.conf.http
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

ENTRYPOINT ["/start-nginx.sh"]
