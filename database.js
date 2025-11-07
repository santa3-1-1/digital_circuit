const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

// 初始化数据表
db.serialize(() => {
  // 预习模块内容表
  db.run(`CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT
  )`);

  // 练习模块题目表
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    options TEXT,
    answer TEXT
  )`);

  // 插入示例数据（仅当表为空）
  db.get("SELECT COUNT(*) AS count FROM topics", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO topics (title, content) VALUES 
        ('与门', '所有输入为1时输出为1'),
        ('或门', '任一输入为1时输出为1')`);
    }
  });

  db.get("SELECT COUNT(*) AS count FROM questions", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO questions (question, options, answer) VALUES
        ('下列哪个逻辑门在所有输入为1时输出为1？', '["与门","或门","非门"]', '与门'),
        ('下列哪个逻辑门在任一输入为1时输出为1？', '["与门","或门","异或门"]', '或门')`);
    }
  });
});

module.exports = db;
