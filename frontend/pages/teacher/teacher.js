Page({
  data: {
    stats: []
  },

  onLoad() {
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/user-stats?role=teacher',
      success: (res) => {
        this.setData({ stats: res.data });
      },
      fail: () => {
        wx.showToast({ title: '加载学生数据失败', icon: 'error' });
      }
    });
  }
});
