const express = require('express');
const cors = require('cors');
const db = require('./database');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ===== 根路由测试服务 =====
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Server is live' }));

// ===== 预习模块接口 =====

// 获取章节列表
app.get('/api/topics', (req, res) => {
  db.all("SELECT * FROM topics", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    res.json(rows);
  });
});

// 获取章节内容（分页）
app.get('/api/chapters/:chapterId/content', (req, res) => {
  const chapterId = req.params.chapterId;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 3;
  const offset = (page - 1) * pageSize;

  db.all(
    `SELECT * FROM content_segments WHERE chapter_id=? ORDER BY order_index ASC LIMIT ? OFFSET ?`,
    [chapterId, pageSize, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "数据库查询错误" });

      const segments = rows.map(r => ({
        segmentId: r.id,
        order: r.order_index,
        text: r.text,
        media: JSON.parse(r.media || "[]")
      }));

      db.get(
        `SELECT COUNT(*) AS total FROM content_segments WHERE chapter_id=?`,
        [chapterId],
        (err2, countRow) => {
          if (err2) return res.status(500).json({ error: "数据库查询错误" });
          res.json({
            chapterId,
            page,
            pageSize,
            totalPages: Math.ceil(countRow.total / pageSize),
            segments
          });
        }
      );
    }
  );
});

// 获取用户标注
app.get('/api/annotations', (req, res) => {
  const { user_id, chapter_id } = req.query;
  db.all(
    `SELECT * FROM annotations WHERE user_id=? AND chapter_id=?`,
    [user_id, chapter_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "查询标注失败" });
      res.json(rows.map(r => ({
        annotationId: r.id,
        segmentId: r.segment_id,
        text: r.text,
        createdAt: r.created_at
      })));
    }
  );
});

// 保存标注
app.post('/api/annotations', (req, res) => {
  const { user_id, chapter_id, segment_id, text } = req.body;
  if (!user_id || !chapter_id || !segment_id || !text)
    return res.status(400).json({ error: "缺少必要字段" });

  db.run(
    `INSERT INTO annotations (user_id, chapter_id, segment_id, text) VALUES (?,?,?,?)`,
    [user_id, chapter_id, segment_id, text],
    function(err) {
      if (err) return res.status(500).json({ error: "保存失败" });
      res.json({ ok: true, annotationId: this.lastID });
    }
  );
});

// 获取章节小测
app.get('/api/chapters/:chapterId/quiz', (req, res) => {
  const chapterId = req.params.chapterId;
  db.all(
    `SELECT * FROM quizzes WHERE chapter_id=?`,
    [chapterId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "获取小测失败" });
      res.json(rows.map(r => ({
        quizId: r.id,
        type: r.type,
        stem: r.stem,
        options: JSON.parse(r.options || "[]"),
        answer: r.answer
      })));
    }
  );
});

// 提交小测答案
app.post('/api/quiz/submit', (req, res) => {
  const { user_id, quiz_id, answer } = req.body;
  if (!user_id || !quiz_id || !answer)
    return res.status(400).json({ error: "缺少字段" });

  db.get(`SELECT answer FROM quizzes WHERE id=?`, [quiz_id], (err, row) => {
    if (err) return res.status(500).json({ error: "查询题目失败" });
    if (!row) return res.status(404).json({ error: "题目不存在" });
    const correct = row.answer === answer;
    res.json({ correct, answer: row.answer });
  });
});

// ===== 保留练习模块接口 =====
app.get('/api/questions', (req, res) => {
  db.all("SELECT * FROM questions", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// 提交练习答案
app.post('/api/submit', (req, res) => {
  const { user_id, question_id, is_correct } = req.body;
  if (!question_id || is_correct === undefined) return res.status(400).json({ error: '缺少必要字段' });

  db.run(
    `INSERT INTO answer_records (user_id, question_id, is_correct) VALUES (?,?,?)`,
    [user_id || 'guest', question_id, is_correct ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: '保存答题记录失败' });

      if (!is_correct) {
        db.run(`INSERT OR IGNORE INTO wrong_questions (user_id, question_id) VALUES (?, ?)`, [user_id || 'guest', question_id]);
      } else {
        db.run(`DELETE FROM wrong_questions WHERE user_id=? AND question_id=?`, [user_id || 'guest', question_id]);
      }

      res.json({ message: '答题记录已保存' });
    }
  );
});

// ===== 启动服务 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running with SQLite at http://localhost:${PORT}`);
});

