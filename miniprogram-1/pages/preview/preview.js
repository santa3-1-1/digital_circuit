Page({
  data: {
    topics: [],
    loading: true
  },

  onLoad() {
    // 加载数据
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/topics',
      success: res => this.setData({ topics: res.data, loading: false }),
      fail: () => this.setData({ loading: false })
    });
  },

  // 跳转练习模块
  goPractice() {
    // 使用 wx.switchTab
    wx.switchTab({
      url: '/pages/practice/practice',
      success: () => console.log('跳转成功'),
      fail: err => console.error('跳转失败', err)
    });
  }
});
