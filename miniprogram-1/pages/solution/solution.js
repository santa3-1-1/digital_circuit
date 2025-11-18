const app = getApp();

Page({
  data: {
    questions: [],
    score: 0,
    total: 0,
    loading: false
  },

  onLoad(options) {
    const self = this;

    // 接收成绩
    this.setData({
      score: options.score,
      total: options.total
    });

    // ✅ 使用全局 fetchData 获取题目
    app.fetchData('https://digital-circuit-server.onrender.com/api/questions', function(data){
      self.setData({ questions: data });
    });
  }
});
