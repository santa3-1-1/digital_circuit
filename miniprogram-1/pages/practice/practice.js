import { request } from "../../utils/api"

Page({
  data: {
    currentIndex: 0,
    total: 0,
    question: {},
    selected: "",
    showExplain: false,
    isFavorite: false
  },

  onLoad() {
    this.loadQuestion()
  },

  // ======== 加载题目 ========
  async loadQuestion() {
    const { currentIndex } = this.data

    try {
      const res = await request(`/api/question?index=${currentIndex}`, "GET")

      if (!res.question) {
        wx.showToast({ title: "题目不存在", icon: "none" })
        return
      }
      console.log("接口返回 res:", res);
      console.log("question 对象:", res.question);
      
      this.setData({
        question: res.question,
        total: res.total,
        selected: "",
        showExplain: false,
        isFavorite: false // 默认 false
      })
    } catch (err) {
      wx.showToast({ title: "加载失败", icon: "none" })
      console.error(err)
    }
  },

  // ======== 选择答案 ========
  onSelectOption(e) {
    this.setData({ selected: e.currentTarget.dataset.option })
  },

  // ======== 跳转解析 ========
  // goExplain() {
  //   console.log('点击解析按钮', this.data.question); 
  //   const q = this.data.question
  //   wx.navigateTo({
  //     url: `/pages/solution/explain?id=${q.id}`
  //   })
  // },

  // ======== 收藏切换 ========
  async onToggleFavorite() {
    const { question, isFavorite } = this.data
    const user_id = String(wx.getStorageSync('user_id')); // ✅ 真实用户 ID
  
    try {
      await request("/api/favorite", "POST", {
        user_id,
        question_id: question.id
      })
      this.setData({ isFavorite: !isFavorite }) // 切换收藏状态
      wx.showToast({ title: isFavorite ? "取消收藏" : "收藏成功", icon: "success" })
    } catch (err) {
      wx.showToast({ title: "收藏失败", icon: "none" })
      console.error(err)
    }
  }
,  

  // ======== 提交并判断对错 ========
// 提交答案
async onSubmit() {
  const { selected, question } = this.data;
  const user_id = wx.getStorageSync('user_id'); 
  if (!selected) {
    wx.showToast({ title: '请选择答案', icon: 'none' });
    return;
  }

  try {
    const res = await request("/api/submit", "POST", {
      user_id,  // ✅ 使用真实用户id
      question_id: question.id,
      is_correct: selected === question.answer
    });

    // 判断是否答对
    if (res.isCorrect) {
      wx.showToast({ title: '回答正确！', icon: 'success' });
    } else {
      wx.showToast({ title: '回答错误', icon: 'error' });
    }

  } catch (err) {
    wx.showToast({ title: '提交失败', icon: 'none' });
    console.error(err);
  }
}

,
// 点击解析按钮显示解析

goExplain() {
  this.setData({ showExplain: true });
}

,

  // ======== 下一题 ========
  onNext() {
    if (this.data.currentIndex >= this.data.total - 1) {
      wx.showToast({ title: '已经是最后一题', icon: 'none' })
      return
    }
    this.setData({ currentIndex: this.data.currentIndex + 1 }, () => this.loadQuestion())
  },

  // ======== 上一题 ========
  onPrev() {
    if (this.data.currentIndex === 0) {
      wx.showToast({ title: '已经是第一题', icon: 'none' })
      return
    }
    this.setData({ currentIndex: this.data.currentIndex - 1 }, () => this.loadQuestion())
  }
})
