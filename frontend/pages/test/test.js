const app = getApp();

Page({
  data: {
    questions: [],
    currentIndex: 0,
    score: 0,
    timeLeft: 300, // 倒计时5分钟（单位秒）
    isFinished: false
  },

  onLoad() {
    this.loadTest();
    this.startTimer();
  },

  loadTest() {
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/test?num=5',
      success: (res) => {
        this.setData({ questions: res.data });
      },
      fail: () => wx.showToast({ title: '加载测试题失败', icon: 'error' })
    });
  },

  startTimer() {
    this.timer = setInterval(() => {
      if (this.data.timeLeft > 0) {
        this.setData({ timeLeft: this.data.timeLeft - 1 });
      } else {
        clearInterval(this.timer);
        this.finishTest();
      }
    }, 1000);
  },

  selectOption(e) {
    const { option } = e.currentTarget.dataset;
    const { questions, currentIndex, score } = this.data;
    const currentQ = questions[currentIndex];
    const isCorrect = option === currentQ.answer;

    // 上传答题记录
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/submit',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        user_id: app.globalData?.user_id || 'guest',
        question_id: currentQ.id,
        is_correct: isCorrect
      }
    });

    // 加分并跳到下一题
    if (isCorrect) {
      this.setData({ score: score + 1 });
    }

    if (currentIndex < questions.length - 1) {
      this.setData({ currentIndex: currentIndex + 1 });
    } else {
      this.finishTest();
    }
  },

  finishTest() {
    clearInterval(this.timer);
    this.setData({ isFinished: true });
    wx.showToast({ title: '测试结束！', icon: 'none' });

    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/solution/solution?score=${this.data.score}&total=${this.data.questions.length}`
      });
    }, 1000);
  },

  onUnload() {
    clearInterval(this.timer);
  }
});
