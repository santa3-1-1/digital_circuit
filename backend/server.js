const express = require('express');
const cors = require('cors');
const db = require('./database'); // 或者 './upgrade.js'，确保你的 db 初始化正确
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ===== 根路由测试服务是否在线 =====
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is live' });
});

// ===== 原有接口：练习模块 / 题目 =====
app.get('/api/questions', (req, res) => {
  db.all("SELECT * FROM questions", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// ===== 原有接口：答题记录提交 =====
app.post('/api/submit', (req, res) => {
  const { user_id, question_id, is_correct } = req.body;
  if (!question_id || is_correct === undefined) return res.status(400).json({ error: '缺少必要字段' });

  db.run(`INSERT INTO answer_records (user_id, question_id, is_correct) VALUES (?, ?, ?)`,
    [user_id || 'guest', question_id, is_correct ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: '保存答题记录失败' });

      if (!is_correct) {
        db.run(`INSERT OR IGNORE INTO wrong_questions (user_id, question_id) VALUES (?, ?)`, [user_id || 'guest', question_id]);
      } else {
        db.run(`DELETE FROM wrong_questions WHERE user_id = ? AND question_id = ?`, [user_id || 'guest', question_id]);
      }

      res.json({ message: '答题记录已保存' });
    }
  );
});

// ===== 原有接口：错题查询 =====
app.get('/api/wrongs', (req, res) => {
  const user_id = req.query.user_id || 'guest';
  db.all(
    `SELECT q.id, q.question, q.options, q.answer
     FROM wrong_questions w
     JOIN questions q ON w.question_id = q.id
     WHERE w.user_id = ?`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: '查询错题失败' });
      const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
      res.json(formatted);
    }
  );
});

// ===== 原有接口：随机抽题 =====
app.get('/api/test', (req, res) => {
  const num = parseInt(req.query.num) || 5;
  db.all(`SELECT * FROM questions ORDER BY RANDOM() LIMIT ?`, [num], (err, rows) => {
    if (err) return res.status(500).json({ error: '获取测试题失败' });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// ===== 原有接口：普通账号密码登录 =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名或密码不能为空' });

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

// ===== 原有接口：微信一键登录 =====
app.post('/api/wxlogin', async (req, res) => {
  const { code } = req.body;

  try {
    const sessionData = await getSessionFromWeixin(code);
    const openid = sessionData.openid;

    if (!openid) return res.status(400).json({ error: '获取openid失败' });

    db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, user) => {
      if (err) return res.status(500).json({ error: '数据库查询错误' });

      if (user) {
        res.json(user);
      } else {
        const username = `游客_${Date.now()}`;
        const role = 'student';
        db.run('INSERT INTO users (username, role, openid) VALUES (?, ?, ?)',
          [username, role, openid],
          function(err) {
            if (err) return res.status(500).json({ error: '注册游客失败' });
            db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err2, newUser) => {
              if (err2) return res.status(500).json({ error: '查询新用户失败' });
              res.json(newUser);
            });
          });
      }
    });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ===== 原有接口：教师查看学生答题统计 =====
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

// ===== 新增接口：预习模块 =====

// 获取章节列表
app.get('/api/topics', (req, res) => {
  db.all("SELECT * FROM topics", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    res.json(rows);
  });
});

// 获取章节内容分页
app.get('/api/chapters/:chapterId/content', (req, res) => {
  const chapterId = req.params.chapterId;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 3;
  const offset = (page - 1) * pageSize;

  db.all(`SELECT * FROM content_segments WHERE chapter_id=? ORDER BY order_index ASC LIMIT ? OFFSET ?`,
    [chapterId, pageSize, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "数据库查询错误" });

      const segments = rows.map(r => ({
        segmentId: r.id,
        order: r.order_index,
        text: r.text,
        media: JSON.parse(r.media || "[]")
      }));

      db.get(`SELECT COUNT(*) AS total FROM content_segments WHERE chapter_id=?`, [chapterId],
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
    });
});

// 获取用户标注
app.get('/api/annotations', (req, res) => {
  const { user_id, chapter_id } = req.query;
  db.all(`SELECT * FROM annotations WHERE user_id=? AND chapter_id=?`, [user_id, chapter_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "查询标注失败" });
      res.json(rows.map(r => ({
        annotationId: r.id,
        segmentId: r.segment_id,
        text: r.text,
        createdAt: r.created_at
      })));
    });
});

// 保存标注
app.post('/api/annotations', (req, res) => {
  const { user_id, chapter_id, segment_id, text } = req.body;
  if (!user_id || !chapter_id || !segment_id || !text) return res.status(400).json({ error: "缺少必要字段" });

  db.run(`INSERT INTO annotations (user_id, chapter_id, segment_id, text) VALUES (?,?,?,?)`,
    [user_id, chapter_id, segment_id, text],
    function(err) {
      if (err) return res.status(500).json({ error: "保存失败" });
      res.json({ ok: true, annotationId: this.lastID });
    });
});

// 获取章节小测
app.get('/api/chapters/:chapterId/quiz', (req, res) => {
  const chapterId = req.params.chapterId;
  db.all(`SELECT * FROM quizzes WHERE chapter_id=?`, [chapterId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "获取小测失败" });
      res.json(rows.map(r => ({
        quizId: r.id,
        type: r.type,
        stem: r.stem,
        options: JSON.parse(r.options || "[]"),
        answer: r.answer
      })));
    });
});

// 提交小测答案
app.post('/api/quiz/submit', (req, res) => {
  const { user_id, quiz_id, answer } = req.body;
  if (!user_id || !quiz_id || !answer) return res.status(400).json({ error: "缺少字段" });

  db.get(`SELECT answer FROM quizzes WHERE id=?`, [quiz_id], (err, row) => {
    if (err) return res.status(500).json({ error: "查询题目失败" });
    if (!row) return res.status(404).json({ error: "题目不存在" });
    const correct = row.answer === answer;
    res.json({ correct, answer: row.answer });
  });
});

// ===== 微信接口换取 session_key 和 openid =====
async function getSessionFromWeixin(code) {
  const appid = 'wx152d55febb831e42';
  const secret = 'c1638bc056f33cb02c19b75a85198975';
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

  try {
    const resp = await axios.get(url);
    if (resp.data.errcode) throw new Error(`微信接口返回错误: ${resp.data.errmsg}`);
    return resp.data; // { openid, session_key, unionid? }
  } catch (err) {
    throw err;
  }
}

// ===== 启动服务 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running with SQLite at http://localhost:${PORT}`));
