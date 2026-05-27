#!/bin/bash
# ============================================
# 2048 Game + Leaderboard API - 一鍵部署到 Google Cloud Run
# ============================================
# 使用方式：
#   ./deploy.sh
#
# 前置需求：
#   1. 安裝 Google Cloud SDK: https://cloud.google.com/sdk/docs/install
#   2. 執行 gcloud auth login
#   3. 設定專案: gcloud config set project YOUR_PROJECT_ID
#   4. 啟用必要 API:
#      gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
#   5. 建立 Artifact Registry 倉庫（首次）:
#      gcloud artifacts repositories create game-2048-repo \
#        --repository-format=docker \
#        --location=asia-east1
#   6. 啟用 Firestore（首次）:
#      gcloud firestore databases create --location=asia-east1
# ============================================

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  2048 Game + Leaderboard API${NC}"
echo -e "${GREEN}  部署到 Cloud Run${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 檢查 gcloud 是否安裝
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}錯誤：找不到 gcloud 指令${NC}"
    echo "請先安裝 Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 檢查是否已登入
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}請先登入 Google Cloud${NC}"
    gcloud auth login
fi

# 取得當前專案 ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}請輸入您的 GCP 專案 ID：${NC}"
    read -r PROJECT_ID
    gcloud config set project "$PROJECT_ID"
fi

echo -e "${GREEN}專案 ID: ${PROJECT_ID}${NC}"
echo ""

# 確認部署
echo -e "${YELLOW}即將部署以下服務到 Cloud Run：${NC}"
echo "  1. 前端遊戲: game-2048"
echo "  2. 排行榜 API: game-2048-api"
echo "區域: asia-east1"
echo ""
read -p "是否繼續？(y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "部署已取消"
    exit 0
fi

# 執行 Cloud Build
echo -e "${GREEN}開始建置與部署...${NC}"
echo -e "${GREEN}這將同時建置前端（Nginx）和後端（Node.js）映像${NC}"
echo ""
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_REGION=asia-east1,_REPO_NAME=game-2048-repo,_FRONTEND_SERVICE_NAME=game-2048,_API_SERVICE_NAME=game-2048-api,_TAG=latest \
    .

# 取得前端部署網址
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

FRONTEND_URL=$(gcloud run services describe game-2048 \
    --region=asia-east1 \
    --format="value(status.url)" 2>/dev/null)

API_URL=$(gcloud run services describe game-2048-api \
    --region=asia-east1 \
    --format="value(status.url)" 2>/dev/null)

echo -e "${GREEN}服務網址：${NC}"
echo ""

if [ -n "$FRONTEND_URL" ]; then
    echo -e "  🎮 前端遊戲: ${YELLOW}${FRONTEND_URL}${NC}"
fi

if [ -n "$API_URL" ]; then
    echo -e "  ⚙️  排行榜 API: ${YELLOW}${API_URL}${NC}"
    echo ""
    echo -e "  API 端點："
    echo -e "    GET  ${API_URL}/api/health"
    echo -e "    POST ${API_URL}/api/scores"
    echo -e "    GET  ${API_URL}/api/leaderboard"
fi

echo ""
echo -e "在瀏覽器中打開遊戲："
if [ -n "$FRONTEND_URL" ]; then
    echo -e "  Windows: start ${FRONTEND_URL}"
    echo -e "  macOS: open ${FRONTEND_URL}"
    echo -e "  Linux: xdg-open ${FRONTEND_URL}"
fi
