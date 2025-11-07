const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// 预习模块接口
app.get('/api/topics', (req, res) => {
  db.all("SELECT * FROM topics", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "数据库查询错误" });
    } else {
      res.json(rows);
    }
  });
});

// 练习模块接口
app.get('/api/questions', (req, res) => {
  db.all("SELECT * FROM questions", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "数据库查询错误" });
    } else {
      // 解析 options JSON 字段
      const formatted = rows.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }));
      res.json(formatted);
    }
  });
});

app.listen(3000, () => {
  console.log('✅ Server running with SQLite at http://localhost:3000');
});
