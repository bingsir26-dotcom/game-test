# ============================================
# 2048 Game - Cloud Run Deployment
# Base: nginx:alpine (最小映像，約 20MB)
# ============================================

FROM nginx:alpine

# 安裝 envsubst（用於動態替換 nginx 設定中的環境變數）
RUN apk add --no-cache gettext

# 移除預設的 Nginx 靜態檔案
RUN rm -rf /usr/share/nginx/html/*

# 複製 Nginx 設定模板（使用 ${PORT} 變數）
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# 複製 2048 遊戲原始碼
COPY 2048-game/ /usr/share/nginx/html

# 設定檔案權限
RUN chmod -R 755 /usr/share/nginx/html

# Cloud Run 會注入 PORT 環境變數（預設 8080）
EXPOSE 8080

# 使用 entrypoint script 動態替換 PORT 變數
# Cloud Run 以隨機非 root 使用者執行，所以我們用 root 啟動 Nginx
# （Cloud Run 容器已有沙箱保護）
CMD ["/bin/sh", "-c", \
     "envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && \
      nginx -g 'daemon off;'"]
