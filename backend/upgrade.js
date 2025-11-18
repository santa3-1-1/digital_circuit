const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./digital_circuit.db');

db.serialize(() => {
  // 查询 users 表的列信息
  db.all("PRAGMA table_info(users);", (err, rows) => {
    if (err) {
      console.error("查询 users 表结构失败:", err);
      process.exit(1);
    }

    // 检查 openid 列是否存在
    const hasOpenid = rows.some(col => col.name === 'openid');

    if (hasOpenid) {
      console.log('✅ users 表已有 openid 列，无需修改');
      process.exit(0);
    }

    // 添加 openid 列
    db.run("ALTER TABLE users ADD COLUMN openid TEXT UNIQUE;", (err2) => {
      if (err2) {
        console.error("添加 openid 列失败:", err2);
        process.exit(1);
      }
      console.log('✅ users 表已成功添加 openid 列');
      process.exit(0);
    });
  });
});
