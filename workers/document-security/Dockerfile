FROM clamav/clamav:1.4

USER root
RUN apk add --no-cache nodejs npm curl

WORKDIR /worker
COPY package.json package-lock.json ./
COPY src ./src
COPY entrypoint.sh ./
RUN npm ci --omit=dev
RUN chmod 755 /worker/entrypoint.sh

ENV SCAN_POLL_MS=5000
ENV PURGE_POLL_MS=60000
ENTRYPOINT ["/worker/entrypoint.sh"]
