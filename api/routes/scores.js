// ============================================
// 分數路由 - 提交分數與排行榜
// ============================================

const express = require('express');
const router = express.Router();

const COLLECTION_NAME = 'scores';

// ============================================
// POST /api/scores - 提交分數
// ============================================
router.post('/scores', async (req, res) => {
  try {
    const { player_name, score, grid_size } = req.body;

    // 輸入驗證
    if (!player_name || typeof player_name !== 'string') {
      return res.status(400).json({ error: 'player_name 為必填，且須為字串' });
    }
    if (!Number.isInteger(score) || score <= 0) {
      return res.status(400).json({ error: 'score 為必填，且須為正整數' });
    }

    const trimmedName = player_name.trim().slice(0, 20);
    if (trimmedName.length === 0) {
      return res.status(400).json({ error: 'player_name 不可為空白' });
    }

    const db = req.app.locals.db;
    const scoresRef = db.collection(COLLECTION_NAME);

    // 寫入 Firestore
    const docRef = await scoresRef.add({
      player_name: trimmedName,
      score: score,
      grid_size: grid_size || '4x4',
      created_at: new Date(),
    });

    // 計算排名（分數高於此筆的數量 + 1）
    const higherCountSnapshot = await scoresRef
      .where('score', '>', score)
      .count()
      .get();
    const rank = higherCountSnapshot.data().count + 1;

    res.status(201).json({
      success: true,
      id: docRef.id,
      rank: rank,
      message: '分數已記錄',
    });
  } catch (err) {
    console.error('Error submitting score:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// ============================================
// GET /api/leaderboard - 取得排行榜
// ============================================
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const db = req.app.locals.db;
    const scoresRef = db.collection(COLLECTION_NAME);

    // 按分數降冪排序，取前 N 筆
    const snapshot = await scoresRef
      .orderBy('score', 'desc')
      .orderBy('created_at', 'asc')
      .limit(limit)
      .get();

    // 取得總玩家數
    const totalSnapshot = await scoresRef.count().get();
    const totalPlayers = totalSnapshot.data().count;

    const leaderboard = [];
    let rank = 1;
    snapshot.forEach((doc) => {
      const data = doc.data();
      leaderboard.push({
        rank: rank++,
        player_name: data.player_name,
        score: data.score,
        grid_size: data.grid_size || '4x4',
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
      });
    });

    res.json({
      leaderboard,
      total_players: totalPlayers,
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;
