// server.js
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

// ===== 预习模块接口 =====
app.get('/api/topics', (req, res) => {
  db.all("SELECT * FROM topics", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    res.json(rows);
  });
});

// ===== 练习模块接口 =====
app.get('/api/questions', (req, res) => {
  db.all("SELECT * FROM questions", (err, rows) => {
    if (err) return res.status(500).json({ error: "数据库查询错误" });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// ===== 学习统计接口 =====
app.get('/api/stats', (req, res) => {
  const user_id = req.query.user_id || 'guest';
  db.get(`SELECT COUNT(*) AS total FROM answer_records WHERE user_id = ?`, [user_id], (err, totalRow) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });
    db.get(`SELECT COUNT(*) AS correct FROM answer_records WHERE user_id = ? AND is_correct = 1`, [user_id], (err2, correctRow) => {
      if (err2) return res.status(500).json({ error: '数据库查询错误' });
      const total = totalRow.total || 0;
      const correct = correctRow.correct || 0;
      const wrong = total - correct;
      const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
      res.json({ total, correct, wrong, accuracy });
    });
  });
});

// ===== 提交答题记录接口 =====
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

// ===== 错题查询接口 =====
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

// ===== 随机抽题接口 =====
app.get('/api/test', (req, res) => {
  const num = parseInt(req.query.num) || 5;
  db.all(`SELECT * FROM questions ORDER BY RANDOM() LIMIT ?`, [num], (err, rows) => {
    if (err) return res.status(500).json({ error: '获取测试题失败' });
    const formatted = rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
    res.json(formatted);
  });
});

// ===== 普通账号密码登录 =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名或密码不能为空' });

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: '数据库查询错误' });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

// ===== 微信一键登录 =====
app.post('/api/wxlogin', async (req, res) => {
  const { code } = req.body;

  try {
    const sessionData = await getSessionFromWeixin(code);
    const openid = sessionData.openid;
    console.log('WX code:', code, 'openid:', openid);

    if (!openid) return res.status(400).json({ error: '获取openid失败' });

    // 查询用户
    db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, user) => {
      if (err) return res.status(500).json({ error: '数据库查询错误' });

      if (user) {
        res.json(user);
      } else {
        // 自动注册游客账号
        const username = `游客_${Date.now()}`;
        const role = 'student';
        db.run(
          'INSERT INTO users (username, role, openid) VALUES (?, ?, ?)',
          [username, role, openid],
          function(err) {
            if (err) { console.error(err); return res.status(500).json({ error: '注册游客失败' }); }
            db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err2, newUser) => {
              if (err2) return res.status(500).json({ error: '查询新用户失败' });
              res.json(newUser);
            });
          }
        );
      }
    });
  } catch (err) {
    console.error(err);
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


// 微信接口换取 session_key 和 openid
async function getSessionFromWeixin(code) {
  const appid = 'wx152d55febb831e42';      // 替换成你自己的
  const secret = 'c1638bc056f33cb02c19b75a85198975';  // 替换成你自己的
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

  try {
    const resp = await axios.get(url);
    if (resp.data.errcode) {
      console.error('微信接口错误:', resp.data);
      throw new Error(`微信接口返回错误: ${resp.data.errmsg}`);
    }
    return resp.data; // { openid, session_key, unionid? }
  } catch (err) {
    console.error('getSessionFromWeixin异常:', err);
    throw err;
  }
}


// ===== 启动服务 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running with SQLite at http://localhost:${PORT}`);
});
