// app.js
App({
  // 全局方法，页面可以通过 getApp().fetchData 调用
  fetchData(url, callback) {
    const page = getCurrentPages().pop();
    page.setData({ loading: true });
    wx.request({
      url,
      success(res) {
        page.setData({ loading: false });
        if(res.data.status === 0) callback(res.data.data);
        else wx.showToast({ title: res.data.message || '接口异常', icon: 'none' });
      },
      fail(err) {
        page.setData({ loading: false });
        console.error(err);
        wx.showToast({ title: '请求失败', icon: 'none' });
      }
    });
  },

  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },

  globalData: {
    userInfo: null,
    loading: false,
    questions: [],
    wrongs: [],
    stats: [],
    topics: []
  }
})
