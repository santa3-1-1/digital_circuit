// utils/api.js
const BASE_URL = "https://digital-circuit-server.onrender.com";

export function request(url, method = 'GET', data = {}) {
  // 自动过滤 undefined/null 参数
  if (method.toUpperCase() === 'GET' && Object.keys(data).length > 0) {
    const query = Object.entries(data)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (query) url += (url.includes('?') ? '&' : '?') + query;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: url.startsWith("http") ? url : BASE_URL + url,
      method,
      data: method.toUpperCase() === 'POST' ? data : {},
      success(res) {
        const d = res.data;
        // 如果后端返回 { status, data } 结构
        if (d && (d.status === 0 || d.status === '0') && d.data !== undefined) {
          resolve(d.data);
        } else {
          // 返回数组/对象直接 resolve
          resolve(d);
        }
      },
      fail(err) {
        wx.showToast({ title: '请求失败', icon: 'error' });
        reject(err);
      }
    });
  });
}
