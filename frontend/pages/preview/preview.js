Page({
  data: { topics: [] },

  onLoad() {
    wx.request({
      url: 'https://digital-circuit-server.onrender.com/api/topics'
      ,
      method: 'GET',
      success: (res) => {
        this.setData({ topics: res.data });
      }
    });
  },

  goPractice() {
    wx.navigateTo({
      url: '/pages/practice/practice'
    });
  }
});
