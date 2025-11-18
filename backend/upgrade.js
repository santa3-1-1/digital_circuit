const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

db.serialize(() => {
  db.all("PRAGMA table_info(users);", (err, rows) => {
    if (err) {
      console.error("查询 users 表结构失败:", err);
      process.exit(1);
    }

    const hasOpenid = rows.some(col => col.name === 'openid');
    if (hasOpenid) {
      console.log('✅ users 表已有 openid 列，无需修改');
      process.exit(0);
    }

    // 先添加普通列
    db.run("ALTER TABLE users ADD COLUMN openid TEXT;", (err2) => {
      if (err2) {
        console.error("添加 openid 列失败:", err2);
        process.exit(1);
      }

      // 再创建唯一索引
      db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_openid ON users(openid);", (err3) => {
        if (err3) {
          console.error("创建 openid 唯一索引失败:", err3);
          process.exit(1);
        }

        console.log('✅ users 表已成功添加 openid 列并建立唯一索引');
        process.exit(0);
      });
    });
  });
});
