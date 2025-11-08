const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    errorMsg: ''
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  login() {
    const { username, password } = this.data;
    if (!username || !password) {
      this.setData({ errorMsg: '请输入账号和密码' });
      return;
    }

    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/login',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { username, password },
      success: (res) => {
        if (res.data.role) {
          wx.showToast({ title: '登录成功', icon: 'success' });
          app.globalData.user = res.data;
          setTimeout(() => {
            if (res.data.role === 'teacher') {
              wx.navigateTo({ url: '/pages/teacher/teacher' });
            } else {
              wx.switchTab({ url: '/pages/preview/preview' });
            }
          }, 800);
        } else {
          this.setData({ errorMsg: '用户名或密码错误' });
        }
      },
      fail: () => {
        this.setData({ errorMsg: '服务器连接失败' });
      }
    });
  }
});
