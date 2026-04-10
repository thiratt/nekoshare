#!/bin/sh
set -eu

if [ -z "${WEB_SERVER_NAME:-}" ]; then
  echo "WEB_SERVER_NAME is required." >&2
  exit 1
fi

main_cert_dir="/etc/nginx/tls/${WEB_SERVER_NAME}"
if [ ! -f "${main_cert_dir}/origin.crt" ] || [ ! -f "${main_cert_dir}/private.key" ]; then
  echo "Missing TLS files for WEB_SERVER_NAME in ${main_cert_dir}. Expected origin.crt and private.key." >&2
  exit 1
fi

if [ -n "${SHORTLINK_SERVER_NAME:-}" ]; then
  if [ -z "${SHORTLINK_REDIRECT_HOST:-}" ]; then
    echo "SHORTLINK_REDIRECT_HOST is required when SHORTLINK_SERVER_NAME is set." >&2
    exit 1
  fi

  shortlink_cert_dir="/etc/nginx/tls/${SHORTLINK_SERVER_NAME}"
  if [ ! -f "${shortlink_cert_dir}/origin.crt" ] || [ ! -f "${shortlink_cert_dir}/private.key" ]; then
    echo "Missing TLS files for SHORTLINK_SERVER_NAME in ${shortlink_cert_dir}. Expected origin.crt and private.key." >&2
    exit 1
  fi

  cat > /etc/nginx/conf.d/shortlink.conf <<EOF
server {
    listen 127.0.0.1:8443 ssl;
    http2 on;
    server_name ${SHORTLINK_SERVER_NAME};

    ssl_certificate /etc/nginx/tls/${SHORTLINK_SERVER_NAME}/origin.crt;
    ssl_certificate_key /etc/nginx/tls/${SHORTLINK_SERVER_NAME}/private.key;

    location = / {
        return 302 https://${WEB_SERVER_NAME}/;
    }

    location / {
        return 302 https://${SHORTLINK_REDIRECT_HOST}\$request_uri;
    }
}
EOF
else
  : > /etc/nginx/conf.d/shortlink.conf
fi

envsubst '${API_SERVER_NAME} ${WEB_SERVER_NAME} ${SHARE_SERVER_NAME} ${NS_SERVER_NAME}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf
