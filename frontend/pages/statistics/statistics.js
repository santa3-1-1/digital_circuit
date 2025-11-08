Page({
  data: {
    total: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0
  },

  onLoad() {
    this.loadStats();
  },

  loadStats() {
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/stats?user_id=guest',
      success: (res) => {
        this.setData({
          total: res.data.total,
          correct: res.data.correct,
          wrong: res.data.wrong,
          accuracy: res.data.accuracy
        });
      },
      fail: () => {
        wx.showToast({ title: '加载统计失败', icon: 'error' });
      }
    });
  }
});
