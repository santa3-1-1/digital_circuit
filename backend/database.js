const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

// 初始化数据表
db.serialize(() => {
  // === 预习模块章节表 ===
  db.run(`CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT
  )`);

  // === 预习模块内容段落 ===
  db.run(`CREATE TABLE IF NOT EXISTS content_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER,
    order_index INTEGER,
    text TEXT,
    media TEXT
  )`);

  // === 用户标注 ===
  db.run(`CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    chapter_id INTEGER,
    segment_id INTEGER,
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // === 练习模块题目表 ===
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    options TEXT,
    answer TEXT,
    explanation TEXT
  )`);

  // === 章节小测题表 ===
  db.run(`CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER,
    type TEXT,
    stem TEXT,
    options TEXT,
    answer TEXT
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

  // 初始化默认用户
  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO users (username, password, role) VALUES
        ('santa', '0311', 'student'),
        ('heather', '0330', 'student'),
        ('teacher', '123456', 'teacher')
      `);
      console.log('✅ 用户表初始化成功');
    }
  });

  // 初始化示例章节
  db.get("SELECT COUNT(*) AS count FROM topics", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO topics (title, content) VALUES 
        ('与门', '所有输入为1时输出为1'),
        ('或门', '任一输入为1时输出为1')`);
    }
  });

  // 初始化示例练习题
  db.get("SELECT COUNT(*) AS count FROM questions", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO questions (question, options, answer) VALUES
        ('下列哪个逻辑门在所有输入为1时输出为1？', '["与门","或门","非门"]', '与门'),
        ('下列哪个逻辑门在任一输入为1时输出为1？', '["与门","或门","异或门"]', '或门')`);
    }
  });

  // 初始化示例内容段落
  db.get("SELECT COUNT(*) AS count FROM content_segments", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO content_segments (chapter_id, order_index, text, media) VALUES
        (1, 1, '与门基础介绍：输出为1当且仅当两个输入都为1', '[]'),
        (1, 2, '与门逻辑表和符号演示', '[]'),
        (2, 1, '或门基础介绍：任意输入为1则输出为1', '[]')`);
    }
  });

  // 初始化示例小测
  db.get("SELECT COUNT(*) AS count FROM quizzes", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO quizzes (chapter_id, type, stem, options, answer) VALUES
        (1, 'tf', '与门输出为1当且仅当两个输入都为1？', '["对","错"]', '对'),
        (2, 'tf', '或门输出为0当所有输入都为0？', '["对","错"]', '对')`);
    }
  });
});

module.exports = db;
