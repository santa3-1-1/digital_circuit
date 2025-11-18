// utils/api.js
export function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      success(res) {
        // 后端返回 { status, data } 格式
        if (res.data && res.data.status === 0 && res.data.data !== undefined) {
          resolve(res.data.data);
        } else {
          // 直接返回数组或对象，也直接 resolve
          resolve(res.data);
        }
      },
      fail(err) {
        wx.showToast({ title: '请求失败', icon: 'error' });
        reject(err);
      }
    });
  });
}
