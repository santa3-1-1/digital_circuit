import { request } from '../../utils/api.js';
const app = getApp();

Page({
  data: {
    questions: [],     // 题目列表
    resultText: "",    // 答题反馈
    loading: true      // 加载状态
  },

  onLoad() {
    this.setData({ loading: true });
    
    // 获取题目列表
    request('https://digital-circuit-server.onrender.com/api/questions')
      .then(data => {
        this.setData({ questions: data, loading: false });
      })
      .catch(err => {
        console.error('获取题目失败:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '题目加载失败', icon: 'error' });
      });
  },

  chooseAnswer(e) {
    // ⚠ 这里一定要对应 WXML 中 data-qid / data-answer / data-choice
    const { qid, answer, choice } = e.currentTarget.dataset;
    const isCorrect = choice === answer;

    // 更新答题反馈
    this.setData({
      resultText: isCorrect ? "✅ 答对了！" : "❌ 答错了，再想想！"
    });

    // 上传答题结果到后端
    request('https://digital-circuit-server.onrender.com/api/submit', 'POST', {
      user_id: app.globalData?.user_id || 'guest',
      question_id: qid,
      is_correct: isCorrect
    })
    .then(res => {
      console.log('答题上传成功:', res);
    })
    .catch(err => {
      console.error('答题上传失败:', err);
      wx.showToast({ title: '上传失败', icon: 'error' });
    });
  }
});
