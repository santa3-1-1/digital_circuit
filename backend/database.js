// =============================
// 📌 SQLite 数据库初始化（带完整注释）
// =============================

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

// ========================================
// 🚀 通过 serialize 确保顺序执行
// ========================================
db.serialize(() => {

  // =============================
  // 1️⃣ 章节主表（预习模块）
  // =============================
  db.run(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT                -- 章节名称，如“第1章：逻辑门基础”
    )
  `);

  // =============================
  // 2️⃣ 章节内容分页表（预习模块）
  // =============================
  db.run(`
    CREATE TABLE IF NOT EXISTS chapter_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER,       -- 所属章节
      page_index INTEGER,       -- 第几页（1, 2, 3...）
      html TEXT                 -- 富文本内容
    )
  `);

  // =============================
  // 3️⃣ 章节小测题（预习模块判断题）
  // =============================
  db.run(`
    CREATE TABLE IF NOT EXISTS chapter_quiz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER,       -- 所属章节 ID
      question TEXT,            -- 判断题题干
      answer INTEGER,           -- 正确答案（1=对, 0=错）
      FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    )
  `);

  // =============================
  // 4️⃣ 章节小测记录（预习模块）
  // =============================
  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,             -- 用户 ID
      quiz_id INTEGER,          -- 对应 chapter_quiz.id
      user_answer INTEGER,      -- 用户的选择（0/1）
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_id) REFERENCES chapter_quiz(id)
    )
  `);

  // =================================================
  // 5️⃣ 主题库（练习/测试/错题解析都从这里取题）
  // =================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapterId INTEGER,        -- 所属章节（用于练习按章节筛选）
      title TEXT,               -- 题干
      options TEXT,             -- JSON 数组，例如 ["A", "B", "C", "D"]
      answer TEXT,              -- 正确答案（直接为字符串）
      explanation TEXT          -- 解析文本
    )
  `);

  // =================================================
  // 6️⃣ 收藏题表（用户与题的关联）
  // =================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS favorite_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,             -- 用户 ID
      question_id INTEGER,      -- 收藏的题目 ID
      UNIQUE(user_id, question_id)  -- 同一题不允许重复收藏
    )
  `);

  // =================================================
  // 7️⃣ 练习/测试答题记录（包括是否做对）
  // =================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS answer_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,             -- 用户 ID
      question_id INTEGER,      -- 题目 ID
      is_correct INTEGER,       -- 是否正确（1=对，0=错）
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =================================================
  // 8️⃣ 错题本（每题只记录一次）
  // =================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS wrong_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,             -- 用户 ID
      question_id INTEGER,      -- 错题 ID
      UNIQUE(user_id, question_id) -- 不重复推入错题本
    )
  `);

  // =================================================
  // 9️⃣ 用户表（学生/老师登录）
  // =================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,      -- 登录用户名
      password TEXT,             -- 密码
      role TEXT CHECK(role IN ('student', 'teacher')), -- 'student' or 'teacher'
      openid TEXT UNIQUE         -- 用于微信授权登录
    )
  `);

  // -------------------------------------------------
  // 🔧 插入默认用户（如果用户表为空）
  // -------------------------------------------------
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

  // =============================
  // 🔧 示例章节插入（仅首次初始化）
  // =============================
  db.get("SELECT COUNT(*) AS count FROM chapters", (err, row) => {
    if (!row || row.count === 0) {
      db.run(`
        INSERT INTO chapters (title) VALUES
        ('第1章：逻辑门基础'),
        ('第2章：组合逻辑'),
        ('第3章：触发器'),
        ('第4章：时序电路')
      `);
    }
  });

  // =============================
  // 🔧 示例章节内容插入
  // =============================
  db.get("SELECT COUNT(*) AS count FROM chapter_content", (err, row) => {
    if (!row || row.count === 0) {
      const contentInserts = [];
      for (let chap = 1; chap <= 4; chap++) {
        contentInserts.push(`(${chap}, 1, '<h3>第${chap}章 - 内容页1</h3><p>这里是第${chap}章的示例内容页1。</p>')`);
        contentInserts.push(`(${chap}, 2, '<h3>第${chap}章 - 内容页2</h3><p>这里是第${chap}章的示例内容页2。</p>')`);
      }
      db.run(`
        INSERT INTO chapter_content (chapter_id, page_index, html)
        VALUES ${contentInserts.join(',')}
      `);
    }
  });

  // =============================
  // 🔧 示例章测题插入（判断题）
  // =============================
  db.get("SELECT COUNT(*) AS count FROM chapter_quiz", (err, row) => {
    if (!row || row.count === 0) {
      const quizInserts = [];
      for (let chap = 1; chap <= 4; chap++) {
        quizInserts.push(`(${chap}, '第${chap}章 - 判断题1内容？', 1)`);
        quizInserts.push(`(${chap}, '第${chap}章 - 判断题2内容？', 0)`);
      }
      db.run(`
        INSERT INTO chapter_quiz (chapter_id, question, answer)
        VALUES ${quizInserts.join(',')}
      `);
    }
  });

  // =============================
  // 🔧 示例：题库默认题目
  // =============================
  db.get("SELECT COUNT(*) AS count FROM questions", (err, row) => {
    if (row.count === 0) {
      console.log("正在插入默认题目...");

      const stmt = db.prepare(`
        INSERT INTO questions (chapterId, title, options, answer, explanation)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        1,
        "下面哪个逻辑门的输出是 AND？",
        JSON.stringify(["与门", "或门", "非门", "异或门"]),
        "与门",
        "AND 门当且仅当两个输入均为 1 时输出 1"
      );

      stmt.run(
        1,
        "二进制 1011 转换为十进制是多少？",
        JSON.stringify(["9", "10", "11", "13"]),
        "11",
        "1011 = 8 + 0 + 2 + 1 = 11"
      );

      stmt.run(
        2,
        "组合逻辑电路的输出只取决于？",
        JSON.stringify(["输入状态", "时钟信号", "锁存器", "触发器"]),
        "输入状态",
        "组合逻辑电路无存储功能，所以输出只依赖输入"
      );

      stmt.finalize();
      console.log("默认题目插入完成！");
    }
  });

}); // END serialize

console.log('✅ 数据库初始化完成');
module.exports = db;
