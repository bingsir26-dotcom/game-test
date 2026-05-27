# ============================================
# 2048 Game - Cloud Run Deployment
# Base: nginx:alpine (最小映像，約 20MB)
# ============================================

FROM nginx:alpine

# 移除預設的 Nginx 靜態檔案
RUN rm -rf /usr/share/nginx/html/*

# 複製自訂 Nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製 2048 遊戲原始碼
COPY 2048-game/ /usr/share/nginx/html

# 設定非 root 使用者執行（安全最佳實踐）
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Cloud Run 要求容器監聽 PORT 環境變數（預設 8080）
# nginx.conf 已設定 listen 8080
EXPOSE 8080

# 以非 root 使用者執行
USER nginx

# 前台執行 Nginx（容器必須保持前台程序）
CMD ["nginx", "-g", "daemon off;"]
