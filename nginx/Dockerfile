FROM nginx:alpine

RUN apk add --no-cache fail2ban iptables

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY nginx.conf.http /etc/nginx/nginx.conf.http
COPY jail.local /etc/fail2ban/jail.local
COPY filter-common-probes.conf /etc/fail2ban/filter.d/common-probes.conf
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

ENTRYPOINT ["/start-nginx.sh"]
