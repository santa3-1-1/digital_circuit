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
    answer TEXT
  )`);

  // === ✅ 新增：答题记录表 ===
  db.run(`CREATE TABLE IF NOT EXISTS answer_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    question_id INTEGER,
    is_correct INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // === ✅ 新增：错题表 ===
  db.run(`CREATE TABLE IF NOT EXISTS wrong_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    question_id INTEGER,
    UNIQUE(user_id, question_id)
  )`);


db.run(`CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT,
  options TEXT,
  answer TEXT,
  explanation TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT CHECK(role IN ('student', 'teacher')),
 openid TEXT UNIQUE
)`);

// 兼容已有数据库：尝试添加 openid 列（若已存在会报错，错误会被忽略）
  db.run(`ALTER TABLE users ADD COLUMN openid TEXT UNIQUE`, (err) => {
    if (err) {
      // 忽略列已存在的错误
      if (!/duplicate|already exists|duplicate column/i.test(err.message)) {
        console.warn('尝试添加 openid 字段时发生错误：', err.message);
      }
    } else {
      console.log('✅ users 表已添加 openid 字段（如先前无此字段）');
    }
  });

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


  // === 插入示例数据（仅当表为空） ===
  db.get("SELECT COUNT(*) AS count FROM topics", (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO topics (title, content) VALUES 
        ('与门', '所有输入为1时输出为1'),
        ('或门', '任一输入为1时输出为1')`);
    }
  });

  db.get("SELECT COUNT(*) AS count FROM questions", (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO questions (question, options, answer) VALUES
        ('下列哪个逻辑门在所有输入为1时输出为1？', '["与门","或门","非门"]', '与门'),
        ('下列哪个逻辑门在任一输入为1时输出为1？', '["与门","或门","异或门"]', '或门')`);
    }
  });
});

module.exports = db;
