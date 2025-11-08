Page({
  data: {
    questions: [],
    score: 0,
    total: 0
  },

  onLoad(options) {
    // 接收成绩
    this.setData({
      score: options.score,
      total: options.total
    });

    // 获取所有题目 + 标准答案
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/questions',
      method: 'GET',
      success: (res) => {
        this.setData({ questions: res.data });
      },
      fail: () => {
        wx.showToast({ title: '加载题目失败', icon: 'error' });
      }
    });
  }
});
