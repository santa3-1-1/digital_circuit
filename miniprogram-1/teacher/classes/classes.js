Page({
  goDashboard() {
    wx.redirectTo({ url: '/teacher/dashboard/dashboard' });
  },
  goStudents() {
    wx.redirectTo({ url: '/teacher/students/students' });
  },
  goClasses() {
    wx.redirectTo({ url: '/teacher/classes/classes' });
  },
  goStats() {
    wx.redirectTo({ url: '/teacher/stats/stats' });
  }
});
