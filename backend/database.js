const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

// 初始化数据表
db.serialize(() => {
  // === 预习模块内容表 ===
  db.run(`CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT
  )`);

  // === 练习模块题目表 ===
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    options TEXT,
    answer TEXT,
    explanation TEXT
  )`);

  // === 答题记录表 ===
  db.run(`CREATE TABLE IF NOT EXISTS answer_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    question_id INTEGER,
    is_correct INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // === 错题表 ===
  db.run(`CREATE TABLE IF NOT EXISTS wrong_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    question_id INTEGER,
    UNIQUE(user_id, question_id)
  )`);

  // === 用户表 ===
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('student', 'teacher')),
    openid TEXT UNIQUE
  )`);

  // === 插入默认用户（不覆盖已有用户） ===
  const defaultUsers = [
    { username: 'santa', password: '0311', role: 'student' },
    { username: 'heather', password: '0330', role: 'student' },
    { username: 'teacher', password: '123456', role: 'teacher' }
  ];

  defaultUsers.forEach(user => {
    db.run(
      `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
      [user.username, user.password, user.role]
    );
  });
  

  // === 插入示例预习模块数据（不覆盖已有数据） ===
  db.get("SELECT COUNT(*) AS count FROM topics", (err, row) => {
    if (!row || row.count === 0) {
      db.run(`INSERT INTO topics (title, content) VALUES 
        ('与门', '所有输入为1时输出为1'),
        ('或门', '任一输入为1时输出为1')`);
    }
  });

  // === 插入示例练习题（不覆盖已有数据） ===
  db.get("SELECT COUNT(*) AS count FROM questions", (err, row) => {
    if (!row || row.count === 0) {
      db.run(`INSERT INTO questions (question, options, answer) VALUES
        ('下列哪个逻辑门在所有输入为1时输出为1？', '["与门","或门","非门"]', '与门'),
        ('下列哪个逻辑门在任一输入为1时输出为1？', '["与门","或门","异或门"]', '或门')`);
    }
  });

});

console.log('✅ 数据库初始化完成');
module.exports = db;
