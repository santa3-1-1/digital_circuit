const express = require('express');
const cors = require('cors');
const db = require('./database'); // 使用现有 database.js
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ===== 根路由测试服务 =====
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is live' });
});

// ===== 练习模块：获取所有题目 =====
app.get('/api/questions', (req, res) => {
  db.all("SELECT * FROM questions", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// ===== 练习模块：提交答案 =====
app.post('/api/submit', (req, res) => {
  const { user_id, question_id, is_correct } = req.body;
  if (!question_id || is_correct === undefined) return res.status(400).json({ error: '缺少必要字段' });

  db.run(
    `INSERT INTO answer_records (user_id, question_id, is_correct) VALUES (?, ?, ?)`,
    [user_id || 'guest', question_id, is_correct ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: '保存答题记录失败' });

      if (!is_correct) {
        db.run(`INSERT OR IGNORE INTO wrong_questions (user_id, question_id) VALUES (?, ?)`, [user_id || 'guest', question_id]);
      } else {
        db.run(`DELETE FROM wrong_questions WHERE user_id = ? AND question_id = ?`, [user_id || 'guest', question_id]);
      }

     // ✅ 返回是否答对
      res.json({
        message: '答题记录已保存',
        isCorrect: is_correct
      });
    }
  );
});

// ===== 收藏题目 =====
app.post('/api/favorite', (req, res) => {
  const { user_id, question_id } = req.body;
  if (!question_id) return res.status(400).json({ error: '缺少题目ID' });

  db.run(
    `INSERT OR IGNORE INTO favorite_questions (user_id, question_id) VALUES (?, ?)`,
    [user_id || 'guest', question_id],
    (err) => {
      if (err) return res.status(500).json({ error: '收藏失败' });
      res.json({ success: true });
    }
  );
});

// 获取收藏题目
app.get('/api/favorite', (req, res) => {
  const user_id = req.query.user_id || 'guest';

  db.all(
    `SELECT q.id, q.title AS question, q.options, q.answer, q.explanation
     FROM favorite_questions f
     JOIN questions q ON f.question_id = q.id
     WHERE f.user_id = ?`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: '查询收藏失败' });
      const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
      res.json(formatted);
    }
  );
});

// ===== 获取单题（按 index，不用 chapterId） =====
app.get('/api/question', (req, res) => {
  const index = parseInt(req.query.index) || 0;

  db.get(`SELECT COUNT(*) AS total FROM questions`, [], (err, totalRow) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });

    db.get(`SELECT * FROM questions LIMIT 1 OFFSET ?`, [index], (err, row) => {
      if (err) return res.status(500).json({ error: '数据库查询错误' });
      if (!row) return res.json({ question: null, total: totalRow.total });

      res.json({
        question: {
          id: row.id,
          question: row.title, // 注意字段名
          options: JSON.parse(row.options),
          answer: row.answer,
          explanation: row.explanation
        },
        total: totalRow.total
      });
    });
  });
});

// ===== 题目解析接口 =====
app.get('/api/explanation', (req, res) => {
  const questionId = req.query.id; // 前端会传 ?id=xxx
  if (!questionId) return res.status(400).json({ error: '缺少题目ID' });

  db.get(
    `SELECT id, title, answer, explanation FROM questions WHERE id = ?`,
    [questionId],
    (err, row) => {
      if (err) return res.status(500).json({ error: '查询失败' });
      if (!row) return res.status(404).json({ error: '题目不存在' });
      res.json(row);
    }
  );
});


// ===== 错题查询 =====
app.get('/api/wrongs', (req, res) => {
  const userId = req.query.user_id;
  console.log("\n===== 🧪 GET /api/wrongs =====");
  console.log("▶ 前端传来的 user_id =", userId);

  // 使用正确表名 wrong_questions
  const sql = `
    SELECT q.id, q.title AS question, q.options, q.answer
    FROM wrong_questions w
    JOIN questions q ON w.question_id = q.id
    WHERE w.user_id = ?
  `;
  console.log("▶ SQL =", sql.trim(), "| PARAMS =", [userId]);

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error("❌ SQL 错误：", err);
      return res.status(500).json({ error: err.message });
    }

    console.log("✔ SQL 查询结果 rows =", rows);

    // 确保 options 返回为数组
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});


// ===== 随机抽题 =====
app.get('/api/test', (req, res) => {
  const num = parseInt(req.query.num) || 5;
  db.all(`SELECT * FROM questions ORDER BY RANDOM() LIMIT ?`, [num], (err, rows) => {
    if (err) return res.status(500).json({ error: '获取测试题失败' });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// ===== 登录 =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名或密码不能为空' });

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

// ===== 微信登录 =====
app.post('/api/wxlogin', async (req, res) => {
  const { code } = req.body;
  try {
    const sessionData = await getSessionFromWeixin(code);
    const openid = sessionData.openid;
    if (!openid) return res.status(400).json({ error: '获取openid失败' });

    db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, user) => {
      if (err) return res.status(500).json({ error: '数据库查询错误' });

      if (user) return res.json(user);

      const username = `游客_${Date.now()}`;
      const role = 'student';
      db.run('INSERT INTO users (username, role, openid) VALUES (?, ?, ?)', [username, role, openid], function(err) {
        if (err) return res.status(500).json({ error: '注册游客失败' });
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err2, newUser) => {
          if (err2) return res.status(500).json({ error: '查询新用户失败' });
          res.json(newUser);
        });
      });
    });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ===== 教师查看学生答题统计 =====
app.get('/api/user-stats', (req, res) => {
  const { role } = req.query;
  if (role !== 'teacher') return res.status(403).json({ error: '无权限访问' });

  const sql = `
    SELECT u.username,
           COUNT(a.id) AS total,
           SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
           ROUND(100.0 * SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(a.id), 1) AS accuracy
    FROM users u
    LEFT JOIN answer_records a ON a.user_id = u.username
    WHERE u.role = 'student'
    GROUP BY u.username
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });
    res.json(rows);
  });
});

// ===== 预习模块 =====
app.get('/preview/chapters', (req, res) => {
  db.all(`SELECT id, title FROM chapters ORDER BY id`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/preview/content', (req, res) => {
  const chapterId = parseInt(req.query.chapterId);
  if (!chapterId) return res.status(400).json({ error: '缺少章节ID' });

  db.all(
    `SELECT page_index, html FROM chapter_content WHERE chapter_id = ? ORDER BY page_index`,
    [chapterId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const contentPages = rows.map(p => p.html);

      db.get(`SELECT id, title FROM chapters WHERE id = ?`, [chapterId], (err2, chapter) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ chapterInfo: chapter, contentPages });
      });
    }
  );
});

app.get('/preview/quiz', (req, res) => {
  const chapterId = parseInt(req.query.chapterId);
  if (!chapterId) return res.status(400).json({ error: '缺少章节ID' });

  db.all(`SELECT id, question, answer FROM chapter_quiz WHERE chapter_id = ?`, [chapterId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/preview/quiz/submit', (req, res) => {
  const { userId, quizId, userAnswer } = req.body;
  if (!quizId) return res.status(400).json({ error: '缺少quizId' });

  db.run(
    `INSERT INTO quiz_record (user_id, quiz_id, user_answer) VALUES (?, ?, ?)`,
    [userId || 'guest', quizId, userAnswer ? 1 : 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, recordId: this.lastID });
    }
  );
});

// ===== 微信接口 =====
async function getSessionFromWeixin(code) {
  const appid = 'wx152d55febb831e42';
  const secret = 'c1638bc056f33cb02c19b75a85198975';
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

  try {
    const resp = await axios.get(url);
    if (resp.data.errcode) throw new Error(`微信接口返回错误: ${resp.data.errmsg}`);
    return resp.data;
  } catch (err) {
    throw err;
  }
}

// ===== 启动服务 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
