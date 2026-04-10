FROM nginx:1.29-alpine AS runner
COPY nginx/templates/nginx.conf.template /etc/nginx/nginx.conf.template
COPY nginx/docker-entrypoint.d/40-render-config.sh /docker-entrypoint.d/40-render-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-config.sh \
	&& rm -f /etc/nginx/conf.d/default.conf \
	&& mkdir -p /etc/nginx/tls

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
