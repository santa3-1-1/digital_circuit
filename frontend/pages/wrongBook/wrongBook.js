const app = getApp();

Page({
  data: {
    wrongList: [],
    feedback: "",
    currentQuestion: null
  },

  onLoad() {
    this.loadWrongQuestions();
  },

  // 加载错题列表
  loadWrongQuestions() {
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/wrongs',
      method: 'GET',
      data: { user_id: app.globalData?.user_id || 'guest' },
      success: (res) => {
        console.log('✅ 获取错题:', res.data);
        this.setData({ wrongList: res.data });
      },
      fail: (err) => {
        console.error('❌ 获取错题失败:', err);
        wx.showToast({ title: '加载失败', icon: 'error' });
      }
    });
  },

  // 点击题目展开答题区
  selectQuestion(e) {
    const question = e.currentTarget.dataset.q;
    this.setData({ currentQuestion: question, feedback: "" });
  },

  // 重新答题
  redoQuestion(e) {
    const { option } = e.currentTarget.dataset;
    const { currentQuestion } = this.data;
    const isCorrect = option === currentQuestion.answer;

    this.setData({
      feedback: isCorrect ? "✅ 回答正确！" : "❌ 回答错误！"
    });

    // 上传重新作答结果（同步更新错题表）
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/submit',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        user_id: app.globalData?.user_id || 'guest',
        question_id: currentQuestion.id,
        is_correct: isCorrect
      },
      success: () => {
        console.log('✅ 错题重新答题结果已上传');
        // 如果答对，刷新错题列表
        if (isCorrect) {
          setTimeout(() => this.loadWrongQuestions(), 800);
        }
      },
      fail: () => wx.showToast({ title: '上传失败', icon: 'error' })
    });
  }
});
