
import { request } from '../../utils/api.js';

const app = getApp();

Page({
  data: {
    stats: [],
    loading: true
  },

  onLoad() {
    this.setData({ loading: true });
request('https://digital-circuit-server.onrender.com/api/user-stats?role=teacher')
  .then(data => this.setData({ stats: data, loading: false }))
  .catch(() => this.setData({ loading: false }));

  }
});
