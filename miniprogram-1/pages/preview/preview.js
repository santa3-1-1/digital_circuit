import { request } from "../../utils/api.js";

Page({
  data: {
    chapters: [],

    currentChapterId: null,
    currentChapter: {},

    contentPages: [],
    currentPage: 0,
    totalPages: 0,

    quizList: [],
    currentQuizIndex: 0,

    loading: true
  },

  onLoad() {
    this.loadChapterList();
    
  },

  /* 1. 获取章节目录 */
  async loadChapterList() {
    const chapters = await request("/preview/chapters", "GET");

    if (!chapters || chapters.length === 0) return;

    this.setData({
      chapters,
      currentChapterId: chapters[0].id
    });

    // 自动加载第一章
    this.loadChapterDetail(chapters[0].id);
  },

  /* 2. 用户点击章节 */
  async onSelectChapter(e) {
    const id = e.currentTarget.dataset.id;

    this.setData({
      currentChapterId: id,
      loading: true,
      currentPage: 0,
      currentQuizIndex: 0,
      contentPages: [],
      quizList: []
    });

    await this.loadChapterDetail(id);

    wx.showToast({
      title: "已切换章节",
      icon: "success"
    });
  },

  /* 3. 获取章节内容 + 小测 */
 /* 3. 获取章节内容 + 小测 */
async loadChapterDetail(chapterId) {
  try {
    // 请求章节内容
    const res = await request(`/preview/content?chapterId=${chapterId}`, "GET");
    
    console.log('后端返回的完整数据:', res);
    console.log('原始contentPages:', res.contentPages);
    
    // 修复这里：直接使用节点对象，不要转换
    const contentPages = res.contentPages || [];
    
    console.log('处理后的contentPages:', contentPages);
    // 请求小测
    const quizList = await request(`/preview/quiz?chapterId=${chapterId}`, "GET");

    this.setData({
      currentChapter: res.chapterInfo || {},
      contentPages,
      totalPages: contentPages.length,
      quizList,
      currentPage: 0,
      currentQuizIndex: 0,
      loading: false
    });
  } catch (err) {
    wx.showToast({ title: '加载章节失败', icon: 'error' });
    console.error(err);
    this.setData({ loading: false });
  }
}
,
  

  /* 内容翻页 */
  prevContentPage() {
    if (this.data.currentPage > 0) {
      this.setData({ currentPage: this.data.currentPage - 1 });
    }
  },

  nextContentPage() {
    if (this.data.currentPage < this.data.totalPages - 1) {
      this.setData({ currentPage: this.data.currentPage + 1 });
    }
  },

  /* 小测回答 */
  async onAnswer(e) {
    const userAnswer = e.currentTarget.dataset.value === "true";
    const correct = this.data.quizList[this.data.currentQuizIndex]?.answer;

    wx.showToast({
      title: userAnswer === correct ? "回答正确" : "回答错误",
      icon: userAnswer === correct ? "success" : "none",
      duration: 800
    });

    if (!this.data.quizList[this.data.currentQuizIndex]) return;

    // 提交答题记录
    await request("/preview/quiz/submit", "POST", {
      userId: wx.getStorageSync("userId") || "guest",
      quizId: this.data.quizList[this.data.currentQuizIndex].id,
      userAnswer
    });
  },

  /* 小测翻页 */
  prevQuiz() {
    if (this.data.currentQuizIndex > 0) {
      this.setData({ currentQuizIndex: this.data.currentQuizIndex - 1 });
    }
  },

  nextQuiz() {
    if (this.data.currentQuizIndex < this.data.quizList.length - 1) {
      this.setData({ currentQuizIndex: this.data.currentQuizIndex + 1 });
    }
  }
});
