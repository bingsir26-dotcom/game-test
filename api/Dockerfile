# ============================================
# 2048 Game - API Server
# Base: node:20-alpine (最小 Node.js 映像)
# ============================================
# 注意：此 Dockerfile 的 build context 是專案根目錄，
# 因此所有 COPY 路徑都相對於根目錄。

FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 先複製 package.json 以利用 Docker layer cache
# 路徑相對於 build context（專案根目錄）
COPY api/package*.json ./

# 安裝 production 依賴（不含 devDependencies）
# 使用 npm install 而非 npm ci，因為沒有 package-lock.json
RUN npm install --omit=dev

# 複製原始碼（api/ 目錄下的所有檔案）
COPY api/ ./

# Cloud Run 會注入 PORT 環境變數（預設 8080）
EXPOSE 8080

# 以非 root 使用者執行（安全最佳實踐）
USER node

# 啟動 API 伺服器
CMD ["node", "server.js"]
