import { request } from '../../utils/api.js';
const app = getApp();

Page({
  data: {
    type: 'wrong', // 'wrong' 或 'favorite'
    questions: [],
    currentIndex: 0,
    selectedAction: '', // 'favorite' 或 'redo' 或 ''
  },

  onLoad() {
    this.loadQuestions();
  },

  loadQuestions() {
    const { type } = this.data;
    console.log("====== 📘 WRONGBOOK LOAD START ======");
  
    console.log("▶ 当前页面类型 type =", type);
  
    const base = type === 'wrong' ? '/api/wrongs' : '/api/favorite';
  
    const uid = wx.getStorageSync('user_id');
    console.log("▶ 读取到的 user_id =", uid, "（类型:", typeof uid, ")");
  
    if (!uid) {
      console.error("❌ user_id 为空！无法请求 wrong/favorite");
      return;
    }
  
    const fullUrl = `${base}?user_id=${uid}`;
    console.log("▶ 最终请求 URL =", fullUrl);
  
    request(fullUrl).then(res => {
      console.log("✔ 后端返回（原始） =", res);
      console.log("✔ 返回类型 =", Object.prototype.toString.call(res));
  
      if (!res || res.length === 0) {
        console.warn("⚠ WARNING：后端返回空数组，没有题目！！！");
      }
  
      const questions = (res || []).map(q => ({
        ...q,
        selectedAction: ''
      }));
  
      console.log("▶ 整理后的 questions =", questions);
  
      this.setData({
        questions,
        currentIndex: 0,
        selectedAction: ''
      });
  
      console.log("接口返回 res:", res);
      console.log("question 对象:", res.question);
      

      console.log("✔ setData 完成, 当前题目数量 =", questions.length);
      console.log("====== 📘 WRONGBOOK LOAD END ======");
    }).catch(err => {
      console.error("❌ WRONGBOOK 请求失败 =", err);
    });
  }
  
,  
  

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    if (type !== this.data.type) {
      this.setData({ type }, () => this.loadQuestions());
    }
  },

  nextQuestion() {
    const { questions, currentIndex } = this.data;
    if (currentIndex + 1 >= questions.length) {
      wx.showToast({ title: '没有更多题目了', icon: 'none' });
    } else {
      this.setData({ currentIndex: currentIndex + 1, selectedAction: '' });
    }
  },

  toggleFavorite() {
    const { currentIndex, questions } = this.data;
    const question = questions[currentIndex];
    const uid = wx.getStorageSync('user_id');
  
    request('/api/favorite', 'POST', {
      user_id: uid,
      question_id: question.id
    }).then(() => {
      wx.showToast({ title: '收藏成功' });
      question.selectedAction = 'favorite';
      this.setData({ questions });
    }).catch(err => {
      wx.showToast({ title: '收藏失败', icon: 'none' });
    });
  }
  
,  
  

  redoQuestion() {
    const { currentIndex, questions } = this.data;
    const question = questions[currentIndex];
    wx.navigateTo({
      url: `/pages/practice/practice?questionId=${question.id}&from=wrongBook`
    });
    question.selectedAction = 'redo';
    this.setData({ questions, selectedAction: 'redo' });
  },

  viewExplanation() {
    const { currentIndex, questions } = this.data;
    const q = questions[currentIndex];
  
    const realId = q.id || q.questionId || q.qid || q.question_id;
  
    if (!realId) {
      console.error("❌ 当前题目没有 ID，无法跳解析：", q);
      return;
    }
  
    wx.navigateTo({
      url: `/pages/solution/solution?questionId=${realId}&from=wrongBook`
    });
  }
  
});
