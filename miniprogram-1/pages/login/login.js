const app = getApp();

Page({
  data: {
    role: 'student',    // 默认学生
    username: '',
    password: '',
    loading: false,
    errorMsg: ''
  },

  // 切换角色
  onSelectRole(e) {
    this.setData({
      role: e.currentTarget.dataset.role
    });
  },

  // 输入监听
  onInput(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value
    });
  },

  // 账号密码登录
  login() {
    const { username, password, role } = this.data;

    if (!username || !password) {
      this.setData({ errorMsg: '请输入账号与密码' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/login',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { username, password, role },
      success: (res) => {
        this.setData({ loading: false });

        if (res.data.role) {
          app.globalData.user = res.data;
          app.globalData.user_id = res.data.id;

          wx.showToast({ title: '登录成功', icon: 'success' });

          setTimeout(() => {
            if (res.data.role === 'teacher') {
              wx.navigateTo({ url: '/pages/teacher/teacher' });
            } else {
              wx.switchTab({ url: '/pages/preview/preview' });
            }
          }, 500);
        } else {
          this.setData({ errorMsg: '账号或密码错误' });
        }
      },
      fail: () => {
        this.setData({ loading: false, errorMsg: '服务器连接失败' });
      }
    });
  },

  // 微信快捷登录
  wxLogin() {
    wx.login({
      success: (res) => {
        if (!res.code) {
          wx.showToast({ title: '登录失败', icon: 'error' });
          return;
        }

        wx.request({
          url: 'https://digital-circuit-server.onrender.com/api/wxlogin',

          method: 'POST',
          data: { code: res.code },
          success: (resp) => {
            const user = resp.data;

            if (!user || !user.id) {
              wx.showToast({ title: '微信登录失败', icon: 'none' });
              return;
            }

            app.globalData.user = user;
            app.globalData.user_id = user.id;

            wx.showToast({ title: '登录成功', icon: 'success' });

            wx.switchTab({ url: '/pages/preview/preview' });
          }
        });
      }
    });
  }
});
