// ============================================
// 2048 Game - Cloud Leaderboard API
// Express + Firestore
// ============================================

const express = require('express');
const cors = require('cors');
const { Firestore } = require('@google-cloud/firestore');

const scoresRouter = require('./routes/scores');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// Firestore 初始化
// ============================================
// Cloud Run 環境中會自動使用服務帳號憑證
// 本地開發需先執行: gcloud auth application-default login
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  databaseId: '(default)',
});

// 將 db 實例傳遞給路由
app.locals.db = db;

// ============================================
// Middleware
// ============================================
app.use(cors({
  origin: '*', // 允許所有來源（開發階段）
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// ============================================
// 路由
// ============================================
app.use('/api', healthRouter);
app.use('/api', scoresRouter);

// ============================================
// 啟動伺服器
// ============================================
app.listen(PORT, () => {
  console.log(`2048 API server listening on port ${PORT}`);
});
