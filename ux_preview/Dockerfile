# Linkee UX preview: static HTML/CSS/JS served by unprivileged nginx on :8080.
# No build step, no environment variables. Build from this directory: docker build -t linkee-ux-preview ux_preview
FROM nginxinc/nginx-unprivileged:1.31.7-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ux-preview.html /usr/share/nginx/html/
COPY styles /usr/share/nginx/html/styles
COPY scripts /usr/share/nginx/html/scripts
# nginx runs as uid 101: make content world-readable whatever the host file modes were.
USER root
RUN chmod -R a+rX /usr/share/nginx/html
USER 101

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
