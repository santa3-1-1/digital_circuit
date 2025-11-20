const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

// 初始化数据表
db.serialize(() => {
  // === 章节表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT
    )
  `);

  // === 章节内容分页表 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS chapter_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER,
      page_index INTEGER,
      html TEXT
    )
  `);

  // === 新：章节小测题 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS chapter_quiz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER,
      question TEXT,
      answer INTEGER,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    )
  `);

  // === 新：章节小测记录 ===
  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      quiz_id INTEGER,
      user_answer INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_id) REFERENCES chapter_quiz(id)
    )
  `);

  // === 原：练习模块题目表 ===
db.run(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    options TEXT,
    answer TEXT,
    explanation TEXT
  )
`);

  // ===【新增】favorite_questions 收藏表===

db.run(`
  CREATE TABLE IF NOT EXISTS favorite_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    question_id INTEGER,
    UNIQUE(user_id, question_id)
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
      const contentInserts = [];
      for (let chap = 1; chap <= 4; chap++) {
        contentInserts.push(`(${chap}, 1, '<h3>第${chap}章 - 内容页1</h3><p>这里是第${chap}章的示例内容页1。</p>')`);
        contentInserts.push(`(${chap}, 2, '<h3>第${chap}章 - 内容页2</h3><p>这里是第${chap}章的示例内容页2。</p>')`);
      }
      db.run(`INSERT INTO chapter_content (chapter_id, page_index, html) VALUES ${contentInserts.join(',')}`);
    }
  });

  // === 插入示例：章节小测判断题 ===
  db.get("SELECT COUNT(*) AS count FROM chapter_quiz", (err, row) => {
    if (!row || row.count === 0) {
      const quizInserts = [];
      for (let chap = 1; chap <= 4; chap++) {
        quizInserts.push(`(${chap}, '第${chap}章 - 判断题1内容？', 1)`);
        quizInserts.push(`(${chap}, '第${chap}章 - 判断题2内容？', 0)`);
      }
      db.run(`INSERT INTO chapter_quiz (chapter_id, question, answer) VALUES ${quizInserts.join(',')}`);
    }
  });


// 插入默认题目：如果没有数据（防止重复插入）
db.get("SELECT COUNT(*) AS count FROM questions", (err, row) => {
  if (row.count === 0) {
    console.log("正在插入默认题目...");

    const stmt = db.prepare(`
      INSERT INTO questions (title, options, answer, explanation)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      "下面哪个逻辑门的输出是 AND？",
      JSON.stringify(["与门", "或门", "非门", "异或门"]),
      "与门",
      "AND 门当且仅当两个输入均为 1 时输出 1"
    );

    stmt.run(
      "二进制 1011 转换为十进制是多少？",
      JSON.stringify(["9", "10", "11", "13"]),
      "11",
      "1011 = 8 + 0 + 2 + 1 = 11"
    );

    stmt.run(
      "组合逻辑电路的输出只取决于？",
      JSON.stringify(["输入状态", "时钟信号", "锁存器", "触发器"]),
      "输入状态",
      "组合逻辑电路无存储功能，所以输出只依赖输入"
    );

    stmt.finalize();
    console.log("默认题目插入完成！");
  }
});

});

console.log('✅ 数据库初始化完成');
module.exports = db;
