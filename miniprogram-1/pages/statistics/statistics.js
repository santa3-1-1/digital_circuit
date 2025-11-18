import { request } from '../../utils/api.js';
const app = getApp();

Page({
  data: {
    total: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    loading: true
  },

  onLoad() {
    this.loadStats();
  },

  loadStats() {
    request('https://digital-circuit-server.onrender.com/api/stats?user_id=guest')
    .then(data => this.setData({ total: data.total, correct: data.correct, wrong: data.wrong, accuracy: data.accuracy }))
    .catch(() => wx.showToast({ title: '加载统计失败', icon: 'error' }));
  
  }
});
