import { request } from '../../utils/api.js';

Page({
  data: {
    question: {},
    isFavorite: false,
    wrongIds: [],
    currentIndex: 0,
    userId: wx.getStorageSync('user_id') || 'guest'
  },

  onLoad(options) {
    const { questionId, wrongIds } = options;
    if (!questionId) {
      wx.showToast({ title: '题目ID缺失', icon: 'none' });
      return;
    }

    const wrongIdsArr = wrongIds ? wrongIds.split(',') : [];
    this.setData({ wrongIds: wrongIdsArr });
    this.loadQuestion(questionId);
  },

  async loadQuestion(id) {
    try {
      const res = await request(`/api/explanation?id=${id}`);
      if (!res) {
        wx.showToast({ title: '加载失败', icon: 'none' });
        return;
      }
      this.setData({ question: res });
      console.log('解析题目:', res);
    } catch (err) {
      console.error('解析接口请求失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  nextQuestion() {
    const { wrongIds, currentIndex } = this.data;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= wrongIds.length) {
      wx.showToast({ title: '已到最后一题', icon: 'none' });
      return;
    }
    this.setData({ currentIndex: nextIndex });
    this.loadQuestion(wrongIds[nextIndex]);
  },

  async onToggleFavorite() {
    const { question, isFavorite, userId } = this.data;
    if (!question.id) return;

    try {
      await request('/api/favorite', 'POST', {
        user_id: userId,
        question_id: question.id
      });
      this.setData({ isFavorite: !isFavorite });
      wx.showToast({ title: isFavorite ? '取消收藏' : '已收藏', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '收藏失败', icon: 'none' });
      console.error('收藏失败', err);
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
