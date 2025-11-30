import { request } from "../../utils/api.js";

Page({
  data: {
    questions: [],
    currentIndex: 0,
    score: 0,
    total: 0,
    submitted: true // 已交卷
  },

  onLoad(options) {
    console.log("❗ testSolution onLoad options:", options);
  
    const { wrongIds, score, total } = options;
    this.setData({
      score: parseInt(score, 10) || 0,
      total: parseInt(total, 10) || 0,
      submitted: true
    });
  
    if (!wrongIds) {
      wx.showToast({ title: '没有错题', icon: 'none' });
      return;
    }
  
    const decoded = decodeURIComponent(wrongIds);
    const ids = decoded.split(',').map(id => parseInt(id, 10));
    console.log("❗ 要加载的错题 ID:", ids);
  
    this.loadWrongQuestions(ids);
  }
  ,

  async loadWrongQuestions(ids) {
    try {
      const questions = [];

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        console.log(`请求错题 ${id}...`);
        const res = await request(`/api/explanation?id=${id}`);
        console.log(`❗ 接口返回（题目 ${id}）:`, res);

        if (res) {
          if (Array.isArray(res)) {
            for (let j = 0; j < res.length; j++) {
              questions.push(res[j]);
              console.log(`➕ 加入题目 ${res[j].id}`);
            }
          } else {
            questions.push(res);
            console.log(`➕ 加入题目 ${res.id}`);
          }
        }
      }

      // 格式化题目，加入题号
      const formatted = [];
      for (let i = 0; i < questions.length; i++) {
        formatted.push({
          ...questions[i],
          questionNumber: i + 1
        });
      }

      console.log("✅ 加载错题完成，最终数组:", formatted);
      this.setData({ questions: formatted });

    } catch (err) {
      console.error('加载错题失败', err);
      wx.showToast({ title: '加载错题失败', icon: 'none' });
    }
  },

  prevQuestion() {
    if (this.data.currentIndex > 0) {
      this.setData({ currentIndex: this.data.currentIndex - 1 });
      console.log("⬅️ 上一题，currentIndex:", this.data.currentIndex);
    }
  },

  nextQuestion() {
    if (this.data.currentIndex < this.data.questions.length - 1) {
      this.setData({ currentIndex: this.data.currentIndex + 1 });
      console.log("➡️ 下一题，currentIndex:", this.data.currentIndex);
    }
  },

  async toggleFavorite() {
    const { currentIndex, questions } = this.data;
    const question = questions[currentIndex];
    const uid = wx.getStorageSync('user_id') || 'guest';

    try {
      await request('/api/favorite', 'POST', {
        user_id: uid,
        question_id: question.id
      });
      wx.showToast({ title: '已收藏', icon: 'success' });
    } catch (err) {
      console.error('收藏失败', err);
      wx.showToast({ title: '收藏失败', icon: 'none' });
    }
  },

  exitTest() {
    wx.reLaunch({ url: '/pages/wrongBook/wrongBook' });
  },

  redoTest() {
    wx.reLaunch({ url: '/pages/test/test' });
  }
});
