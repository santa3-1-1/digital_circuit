const app = getApp(); // 获取全局 user_id（可选）

Page({
  data: {
    questions: [],
    resultText: ""
  },

  onLoad() {
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/questions',
      method: 'GET',
      success: (res) => {
        console.log('✅ 获取题目:', res.data);
        this.setData({ questions: res.data });
      },
      fail: (err) => {
        console.error('❌ 请求失败:', err);
      }
    });
  },

  chooseAnswer(e) {
    const { qid, answer, choice } = e.currentTarget.dataset;
    const isCorrect = choice === answer;

    // 设置答题反馈
    this.setData({
      resultText: isCorrect ? "✅ 答对了！" : "❌ 答错了，再想想！"
    });

    // ✅ 上传答题结果到后端
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/submit',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        user_id: app.globalData?.user_id || 'guest',
        question_id: qid,      // 从 data-qid 获取
        is_correct: isCorrect
      },
      success: (res) => {
        console.log('✅ 答题结果已上传:', res.data);
      },
      fail: (err) => {
        console.error('❌ 上传失败:', err);
        wx.showToast({ title: '上传失败', icon: 'error' });
      }
    });
  }

  
});
