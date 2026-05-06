# Server Git Pull Upgrade

This project is configured to replace the running code while keeping the existing production data.

Keep these existing server resources unchanged:

- Docker containers: `huabu-app`, `huabu-mysql`
- App port: `127.0.0.1:3355`
- MySQL host port: `127.0.0.1:3308`
- MySQL Docker volume: `mysql-data`
- Uploaded files: `./uploads`

Before pulling new code on the server, create a backup:

```bash
cd /www/wwwroot/wlpro.aittco.com

BACKUP=/root/wlpro-backup-$(date +%F-%H%M%S)
mkdir -p "$BACKUP"

cp .env docker-compose.yml "$BACKUP"/
tar -czf "$BACKUP/uploads.tgz" uploads 2>/dev/null || true
docker compose exec -T mysql sh -lc 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > "$BACKUP/mysql.sql"
```

Pull and rebuild:

```bash
cd /www/wwwroot/wlpro.aittco.com
git pull
mkdir -p uploads storage/line4
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=200 app
```

If the existing `.env` does not have the newer runtime variables, append them:

```env
NODE_OPTIONS=--max-old-space-size=1536
BILLING_PENDING_TASK_TIMEOUT_MINUTES=90
BILLING_VIDEO_PENDING_TASK_TIMEOUT_MINUTES=360
GEMINI_API_BASE_URL=https://api.bltcy.ai
PROMPT_TOOL_MODEL=gemini-3.1-pro-preview
PROMPT_OPTIMIZE_COST=0.5
REVERSE_PROMPT_COST=1
GENERATED_ASSET_STORAGE=off
GENERATED_ASSET_PROVIDER=aliyun-oss
GENERATED_ASSET_PREFIX=generated/images
GENERATED_ASSET_MAX_BYTES=52428800
GENERATED_ASSET_DOWNLOAD_TIMEOUT_MS=30000
GENERATED_ASSET_CACHE_CONTROL=public, max-age=31536000, immutable
S3_REGION=auto
S3_FORCE_PATH_STYLE=false
```

Never run this on the production server unless you intentionally want to delete the database volume:

```bash
docker compose down -v
```
