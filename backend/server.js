// server.js（完整版）
const express = require('express');
const cors = require('cors');
const db = require('./database'); 
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ================= 日志工具 =================
function log(title, content) {
  console.log(`\n===== ${title} =====`);
  console.log(content);
  console.log(`===== END ${title} =====\n`);
}

// ================= 根路由测试 =================
app.get('/', (req, res) => {
  res.send('Digital Circuit Server Running...');
});

// ================= 1. 登录接口 =================
app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;

  log('登录请求', req.body);

  db.get(
    `SELECT * FROM users WHERE username=? AND password=? AND role=?`,
    [username, password, role],
    (err, row) => {
      if (err) {
        log('登录失败（数据库错误）', err);
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!row) {
        log('登录失败（无效用户）', { username, role });
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      log('登录成功', row);
      res.json({ success: true, user_id: row.id, role: row.role });
    }
  );
});

// ================= 2. 获取题目（练习用） =================
app.get('/api/questions', (req, res) => {
  log('请求题目列表', '');

  db.all(`SELECT * FROM questions`, [], (err, rows) => {
    if (err) {
      log('获取题目失败', err);
      return res.status(500).json({ error: '获取题目失败' });
    }

    const formatted = rows.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    log('题目返回数量', formatted.length);
    res.json(formatted);
  });
});

// ================= 3. 获取错题 =================
app.get('/api/wrong-list', (req, res) => {
  const user_id = parseInt(req.query.user_id);

  log('获取错题请求', req.query);

  db.all(
    `SELECT q.* 
     FROM wrong_book w 
     JOIN questions q ON q.id = w.question_id
     WHERE w.user_id = ?`,
    [user_id],
    (err, rows) => {
      if (err) {
        log('获取错题失败', err);
        return res.status(500).json({ error: '获取错题失败' });
      }

      const formatted = rows.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }));

      log('错题返回数量', formatted.length);
      res.json(formatted);
    }
  );
});

// ================= 4. 错题提交 =================
app.post('/api/wrong', (req, res) => {
  const { user_id, question_id } = req.body;

  log('添加错题记录', req.body);

  db.run(
    `INSERT INTO wrong_book (user_id, question_id) VALUES (?, ?)`,
    [user_id, question_id],
    (err) => {
      if (err) {
        log('添加错题失败', err);
        return res.status(500).json({ error: '添加错题失败或已添加过' });
      }
      log('错题添加成功', { user_id, question_id });
      res.json({ success: true });
    }
  );
});

// ================= 5. 获取解析（统一接口） =================
app.get('/api/explanation', (req, res) => {
  const id = parseInt(req.query.id);

  log('解析请求题目 ID', id);

  if (!id) {
    return res.status(400).json({ error: '题目 ID 缺失' });
  }

  db.get(`SELECT * FROM questions WHERE id = ?`, [id], (err, row) => {
    if (err) {
      log('解析查询失败', err);
      return res.status(500).json({ error: '查询失败' });
    }
    if (!row) {
      log('解析未找到题目', id);
      return res.status(404).json({ error: '题目不存在' });
    }

    const formatted = {
      ...row,
      options: JSON.parse(row.options)
    };

    log('解析返回结果', formatted);
    res.json(formatted);
  });
});

// ================= 6. 测试随机抽题 =================
app.get('/api/test', (req, res) => {
  const num = parseInt(req.query.num) || 5;

  log('测试抽题请求', { num });

  db.all(
    `SELECT * FROM questions ORDER BY RANDOM() LIMIT ?`,
    [num],
    (err, rows) => {
      if (err) {
        log('测试抽题失败', err);
        return res.status(500).json({ error: '获取测试题失败' });
      }

      const formatted = rows.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }));

      log('测试抽题返回数量', formatted.length);
      res.json(formatted);
    }
  );
});

// ================= 7. 测试提交 =================
app.post('/api/test/submit', (req, res) => {
  const { user_id, answers } = req.body;

  log('测试提交请求', req.body);

  let score = 0;
  const wrongList = [];

  const sql = `SELECT id, answer FROM questions WHERE id IN (${answers.map(() => '?').join(',')})`;

  db.all(sql, answers.map(a => a.id), (err, rows) => {
    if (err) {
      log('测试提交查询失败', err);
      return res.status(500).json({ error: '批改失败' });
    }

    rows.forEach(row => {
      const userAns = answers.find(a => a.id === row.id);
      if (userAns.answer === row.answer) {
        score++;
      } else {
        wrongList.push(row.id);
      }
    });

    if (wrongList.length > 0) {
      const insertSql = `INSERT OR IGNORE INTO wrong_book (user_id, question_id) VALUES (?, ?)`;

      wrongList.forEach(qid => {
        db.run(insertSql, [user_id, qid]);
      });
    }

    log('测试得分', { score, total: answers.length, wrongList });

    res.json({ score, total: answers.length, wrongList });
  });
});

// ================= 服务器启动 =================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
