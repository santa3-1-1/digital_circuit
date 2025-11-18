// 微信一键登录接口
app.post('/api/wxlogin', async (req, res) => {
  try {
    const { code, encryptedData, iv } = req.body;
    if (!code) return res.status(400).json({ error: '缺少 code' });

    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    if (!appid || !secret) return res.status(500).json({ error: '服务器未配置微信 AppID/SECRET' });

    // 调用微信 jscode2session 获取 openid & session_key
    const url = `https://api.weixin.qq.com/sns/jscode2session`;
    const params = { appid, secret, js_code: code, grant_type: 'authorization_code' };
    const { data } = await axios.get(url, { params, timeout: 10000 });

    if (data.errcode) return res.status(500).json({ error: '微信换取 openid 失败', detail: data });

    const openid = data.openid;
    if (!openid) return res.status(500).json({ error: '未获得 openid', detail: data });

    // 查询数据库是否已有该 openid
    db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, user) => {
      if (err) return res.status(500).json({ error: '数据库查询错误' });

      if (user) {
        return res.json({ id: user.id, username: user.username, role: user.role, openid });
      }

      // 新用户：生成用户名并存数据库
      const username = 'wx_' + openid.slice(0, 8);
      const password = '';
      const role = 'student';

      db.run(
        'INSERT INTO users (username, password, role, openid) VALUES (?, ?, ?, ?)',
        [username, password, role, openid],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ error: '创建用户失败', detail: insertErr.message });
          return res.json({ id: this.lastID, username, role, openid });
        }
      );
    });
  } catch (e) {
    console.error('wxlogin 异常：', e.message || e);
    return res.status(500).json({ error: '服务器内部错误', detail: e.message || e });
  }
});
