const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

// 初始化数据表
db.serialize(() => {
  // === 新：章节列表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL
    )
  `);

  // === 新：章节内容分页表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS chapter_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER,
      page_index INTEGER,
      html TEXT,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    )
  `);

  // === 新：章节小测题 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS chapter_quiz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER,
      question TEXT,
      answer INTEGER,   -- 1 代表正确，0 代表错误（判断题）
      FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    )
  `);

  // === 新：章节小测记录 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      quiz_id INTEGER,
      user_answer INTEGER,   -- 用户提交的答案（1/0）
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_id) REFERENCES chapter_quiz(id)
    )
  `);

  // === 原：练习模块题目表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT,
      options TEXT,
      answer TEXT,
      explanation TEXT
    )
  `);

  // === 原：答题记录表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS answer_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      question_id INTEGER,
      is_correct INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // === 原：错题表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS wrong_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      question_id INTEGER,
      UNIQUE(user_id, question_id)
    )
  `);

  // === 原：用户表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('student', 'teacher')),
      openid TEXT UNIQUE
    )
  `);

  // === 默认用户 ===
  const defaultUsers = [
    { username: 'santa', password: '0311', role: 'student' },
    { username: 'heather', password: '0330', role: 'student' },
    { username: 'teacher', password: '123456', role: 'teacher' }
  ];

  defaultUsers.forEach(user => {
    db.run(
      `INSERT OR IGNORE INTO users (username, password, role)
       VALUES (?, ?, ?)`,
      [user.username, user.password, user.role]
    );
  });

  // === 插入示例：章节数据 ===
  db.get("SELECT COUNT(*) AS count FROM chapters", (err, row) => {
    if (!row || row.count === 0) {
      db.run(`INSERT INTO chapters (title) VALUES
        ('第1章：逻辑门基础'),
        ('第2章：组合逻辑'),
        ('第3章：触发器'),
        ('第4章：时序电路')
      `);
    }
  });

  // === 插入示例：章节内容分页 ===
  db.get("SELECT COUNT(*) AS count FROM chapter_content", (err, row) => {
    if (!row || row.count === 0) {
      db.run(`
        INSERT INTO chapter_content (chapter_id, page_index, html)
        VALUES
        (1, 1, '<h3>与门 AND</h3><p>所有输入为1时输出为1。</p>'),
        (1, 2, '<h3>或门 OR</h3><p>任意输入为1时输出为1。</p>')
      `);
    }
  });

  // === 插入示例：章节小测判断题 ===
  db.get("SELECT COUNT(*) AS count FROM chapter_quiz", (err, row) => {
    if (!row || row.count === 0) {
      db.run(`
        INSERT INTO chapter_quiz (chapter_id, question, answer)
        VALUES
        (1, '与门在所有输入为1时输出为1。', 1),
        (1, '或门在所有输入为0时输出为1。', 0)
      `);
    }
  });

  // === 插入示例练习题（保留你的原内容） ===
  db.get("SELECT COUNT(*) AS count FROM questions", (err, row) => {
    if (!row || row.count === 0) {
      db.run(`
        INSERT INTO questions (question, options, answer) VALUES
        ('下列哪个逻辑门在所有输入为1时输出为1？',
         '["与门","或门","非门"]',
         '与门'),

        ('下列哪个逻辑门在任一输入为1时输出为1？',
         '["与门","或门","异或门"]',
         '或门')
      `);
    }
  });

});

console.log('✅ 数据库初始化完成');
module.exports = db;
