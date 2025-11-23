// ===== 引入依赖模块 =====
const express = require('express');  // Express 框架，用于搭建后端 API
const cors = require('cors');        // 跨域请求中间件
const db = require('./database');    // 自己写的 database.js，用于操作 SQLite 数据库
const axios = require('axios');      // 用于请求外部接口（这里用于微信登录）

const app = express();

// ===== 中间件 =====
app.use(cors());                     // 允许跨域请求
app.use(express.json());             // 支持解析 JSON 请求体

// ===== 根路由测试服务 =====
// GET /
// 用于测试服务器是否正常启动
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is live' });
});

// ===== 练习模块 =====

// GET /api/questions
// 获取所有题目（带选项解析 JSON）
// 返回格式：[{id, title, options: [], answer, explanation}]
app.get('/api/questions', (req, res) => {
  db.all("SELECT * FROM questions", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// POST /api/submit
// 用户提交单题答案
// body: { user_id, question_id, is_correct }
// 同时处理错题记录和删除已纠正的错题
app.post('/api/submit', (req, res) => {
  let { user_id, question_id, is_correct } = req.body;

  if (!user_id) return res.status(400).json({ error: '缺少 user_id' });
  if (!question_id || is_correct === undefined) return res.status(400).json({ error: '缺少必要字段' });

  user_id = String(user_id);

  // 插入答题记录
  db.run(
    `INSERT INTO answer_records (user_id, question_id, is_correct) VALUES (?, ?, ?)`,
    [user_id, question_id, is_correct ? 1 : 0],
    function(err) {
      if (err) return res.status(500).json({ error: '保存答题记录失败' });

      // 错题处理
      if (!is_correct) {
        // 如果答错，加入错题表
        db.run(
          `INSERT OR IGNORE INTO wrong_questions (user_id, question_id) VALUES (?, ?)`,
          [user_id, question_id],
          function(err2) {
            if (err2) console.error('❌ 插入错题失败', err2);
          }
        );
      } else {
        // 如果答对，从错题表删除
        db.run(
          `DELETE FROM wrong_questions WHERE user_id = ? AND question_id = ?`,
          [user_id, question_id],
          function(err3) {
            if (err3) console.error('❌ 删除错题失败', err3);
          }
        );
      }

      res.json({ message: '答题记录已保存', isCorrect: is_correct });
    }
  );
});

// POST /api/favorite
// 收藏题目
// body: { user_id, question_id }
app.post('/api/favorite', (req, res) => {
  const { user_id, question_id } = req.body;
  if (!question_id) return res.status(400).json({ error: '缺少题目ID' });

  const uid = String(user_id || 'guest');

  db.run(
    `INSERT OR IGNORE INTO favorite_questions (user_id, question_id) VALUES (?, ?)`,
    [uid, question_id],
    (err) => {
      if (err) return res.status(500).json({ error: '收藏失败' });
      res.json({ success: true, user_id: uid, question_id });
    }
  );
});

// GET /api/favorite
// 获取用户收藏题目
// query: user_id
app.get('/api/favorite', (req, res) => {
  const user_id = String(req.query.user_id || 'guest');

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

// GET /api/question
// 按索引获取单题（不按章节）
// query: index
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
          question: row.title,
          options: JSON.parse(row.options),
          answer: row.answer,
          explanation: row.explanation
        },
        total: totalRow.total
      });
    });
  });
});

// GET /api/explanation
// 获取题目解析
// query: id (题目ID)
app.get('/api/explanation', (req, res) => {
  const questionId = req.query.id;
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

// GET /api/wrongs
// 获取用户错题
// query: user_id
app.get(['/api/wrongs', '/api/wrongs-old'], (req, res) => {
  const userId = String(req.query.user_id || 'guest');

  const sql = `
    SELECT q.id, q.title AS question, q.options, q.answer
    FROM wrong_questions w
    JOIN questions q ON w.question_id = q.id
    WHERE w.user_id = ?
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });

    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// GET /api/test
// 随机抽题（用于测试）
// query: num (题目数量，默认5)
app.get('/api/test', (req, res) => {
  const num = parseInt(req.query.num) || 5;
  db.all(`SELECT * FROM questions ORDER BY RANDOM() LIMIT ?`, [num], (err, rows) => {
    if (err) return res.status(500).json({ error: '获取测试题失败' });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// POST /api/test/submit
// 提交测试结果（批量答题）
// body: { user_id, answers: { question_id: selected_option } }
app.post('/api/test/submit', async (req, res) => {
  const { user_id, answers } = req.body;
  if (!user_id || !answers) return res.status(400).json({ error: '缺少用户或答案数据' });

  const ids = Object.keys(answers);
  if (ids.length === 0) return res.status(400).json({ error: '没有答案' });

  let score = 0;
  const wrongQuestions = [];
  const insertAnswer = db.prepare(`
    INSERT INTO answer_records (user_id, question_id, is_correct) VALUES (?, ?, ?)
  `);

  const tasks = ids.map(id => {
    const selected = answers[id];
    return new Promise((resolve, reject) => {
      db.get(`SELECT answer FROM questions WHERE id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve();

        const is_correct = String(selected) === String(row.answer);
        if (!is_correct) wrongQuestions.push(id);
        if (is_correct) score += 1;

        insertAnswer.run([user_id, id, is_correct ? 1 : 0], (err2) => {
          if (err2) console.error('保存答题记录失败', err2);
        });

        if (!is_correct) {
          db.run(`INSERT OR IGNORE INTO wrong_questions (user_id, question_id) VALUES (?, ?)`, [user_id, id]);
        } else {
          db.run(`DELETE FROM wrong_questions WHERE user_id = ? AND question_id = ?`, [user_id, id]);
        }

        resolve();
      });
    });
  });

  try {
    await Promise.all(tasks);
    insertAnswer.finalize();
    res.json({ message: '测试提交成功', total: ids.length, score, wrongQuestions });
  } catch (err) {
    res.status(500).json({ error: '提交失败', detail: err.message });
  }
});

// POST /api/login
// 用户名密码登录
// body: { username, password }
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名或密码不能为空' });

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

// POST /api/wxlogin
// 微信登录（根据 code 获取 openid）
// body: { code }
app.post('/api/wxlogin', async (req, res) => {
  const { code } = req.body;
  try {
    const sessionData = await getSessionFromWeixin(code);
    const openid = sessionData.openid;
    if (!openid) return res.status(400).json({ error: '获取openid失败' });

    db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, user) => {
      if (user) return res.json(user);

      const username = `游客_${Date.now()}`;
      const role = 'student';
      db.run('INSERT INTO users (username, role, openid) VALUES (?, ?, ?)', [username, role, openid], function(err) {
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err2, newUser) => {
          res.json(newUser);
        });
      });
    });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/user-stats
// 教师查看学生答题统计
// query: role=teacher
app.get(['/api/user-stats', '/api/stats'], (req, res) => {
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
    res.json(rows);
  });
});

// ===== 预习模块 =====

// 获取章节列表
app.get('/preview/chapters', (req, res) => {
  db.all(`SELECT id, title FROM chapters ORDER BY id`, (err, rows) => res.json(rows));
});

// 获取章节内容
// query: chapterId
app.get('/preview/content', (req, res) => {
  const chapterId = parseInt(req.query.chapterId);
  if (!chapterId) return res.json({ chapterInfo: null, contentPages: [] });

  db.all(
    `SELECT page_index, html FROM chapter_content WHERE chapter_id = ? ORDER BY page_index`,
    [chapterId],
    (err, rows) => {
      const contentPages = rows.map(p => p.html);
      db.get(`SELECT id, title FROM chapters WHERE id = ?`, [chapterId], (err2, chapter) => {
        res.json({ chapterInfo: chapter, contentPages });
      });
    }
  );
});

// 获取章节小测
app.get('/preview/quiz', (req, res) => {
  const chapterId = parseInt(req.query.chapterId);
  if (!chapterId) return res.json([]);
  db.all(`SELECT id, question, answer FROM chapter_quiz WHERE chapter_id = ?`, [chapterId], (err, rows) => {
    res.json(rows);
  });
});

// 提交章节小测答案
// body: { userId, quizId, userAnswer }
app.post('/preview/quiz/submit', (req, res) => {
  const { userId, quizId, userAnswer } = req.body;
  db.run(
    `INSERT INTO quiz_record (user_id, quiz_id, user_answer) VALUES (?, ?, ?)`,
    [userId || 'guest', quizId, userAnswer ? 1 : 0],
    function(err) { res.json({ success: true, recordId: this.lastID }); }
  );
});

// ===== 微信接口工具函数 =====
async function getSessionFromWeixin(code) {
  const appid = 'wx152d55febb831e42';
  const secret = 'c1638bc056f33cb02c19b75a85198975';
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

  const resp = await axios.get(url);
  return resp.data;
}

// ===== 启动服务 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
