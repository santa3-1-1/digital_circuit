import { request } from "../../utils/api"
const app = getApp();

Page({
  data: {
    stage: 'start',           // start/testing
    questions: [],
    answers: {},
    currentIndex: 0,
    timeLeft: 900,
    score: 0,
    wrongQuestions: []
  },

  onLoad() {
    console.log("== onLoad: 开始加载测试题 ==");
    this.loadTest();
  },

  // ====== 加载题目 ======
  async loadTest() {
    try {
      const data = await request('/api/test?num=5');
      console.log("== 加载到测试题 ==", data);

      const formatted = data.map(q => ({
        ...q,
        question: q.title || q.question
      }));

      this.setData({ questions: formatted });
    } catch (err) {
      wx.showToast({ title: '加载测试题失败', icon: 'none' });
      console.error("❌ loadTest 错误：", err);
    }
  },

  // ====== 开始测试 ======
  startTest() {
    console.log("== 开始测试 ==");
    this.setData({ stage: 'testing', currentIndex: 0, answers: {}, timeLeft: 900 });
    this.startTimer();
  },

  // ====== 倒计时 ======
  startTimer() {
    console.log("== 启动倒计时 ==");
    this.timer = setInterval(() => {
      if (this.data.timeLeft > 0) {
        this.setData({ timeLeft: this.data.timeLeft - 1 });
      } else {
        clearInterval(this.timer);
        this.submitTest();
      }
    }, 1000);
  },

  // ====== 选择答案 ======
  selectOption(e) {
    const { option } = e.currentTarget.dataset;
    const { currentIndex, questions, answers } = this.data;

    const qid = questions[currentIndex].id;
    answers[qid] = option;
    console.log(`== 选择题目 ${qid} 的选项：${option} ==`);

    this.setData({ answers });
  },

  prevQuestion() {
    if (this.data.currentIndex > 0) {
      console.log("== 上一题 ==");
      this.setData({ currentIndex: this.data.currentIndex - 1 });
    }
  },

  nextQuestion() {
    if (this.data.currentIndex < this.data.questions.length - 1) {
      console.log("== 下一题 ==");
      this.setData({ currentIndex: this.data.currentIndex + 1 });
    }
  },

  // ====== 提交测试结果 ======
async submitTest() {
  const answers = this.data.answers;
  const userId = wx.getStorageSync('user_id') || 'guest';

  try {
    const res = await request('/api/test/submit', 'POST', { user_id: userId, answers });
    console.log('== 服务器返回提交结果 ==', res);

    const wrongIds = res.wrongQuestions || [];
    const score = res.score || 0;
    const total = res.total || 0;

    wx.showToast({ title: `得分 ${score}/${total}`, icon: 'success' });

    // ✅ 修正跳转路径，去掉多余的 /testSolution
    const url = `/pages/solution/testSolution?wrongIds=${encodeURIComponent(wrongIds.join(','))}&score=${score}&total=${total}`;
    console.log('❗ 跳转 URL =', url);

    wx.navigateTo({ url });

  } catch (err) {
    console.error('提交测试失败', err);
    wx.showToast({ title: '提交失败', icon: 'none' });
  }
}
,

  onUnload() {
    clearInterval(this.timer);
  }
});
