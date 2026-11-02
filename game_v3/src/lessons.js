/* Small educational activities share V4 progress; never grant coins or sacraments. */
(function (root) {
  'use strict';
  const definitions = {
    class_basics: {
      version: 1,
      title: 'Ba câu hỏi nhỏ',
      event: 'quiz_class',
      sourceRef: 'class',
      questions: [
        {
          question: 'Khi vào gian chính nhà thờ, em nên làm gì?',
          choices: [
            'Chạy giữa các hàng ghế',
            'Giữ yên lặng và tôn trọng mọi người',
            'Leo lên bậc cung thánh',
          ],
          correct: 1,
        },
        {
          question: 'Đọc xong sách ở lớp, em nên làm gì?',
          choices: [
            'Đặt lại đúng kệ để bạn khác tìm được',
            'Giấu sách vào góc bàn',
            'Để sách ngoài sân',
          ],
          correct: 0,
        },
        {
          question: 'Gặp một người mới đến giáo xứ, em có thể làm gì?',
          choices: ['Bỏ đi ngay', 'Trêu chọc người ấy', 'Chào hỏi và chỉ dẫn lịch sự'],
          correct: 2,
        },
      ],
    },
  };
  function answer(state, lesson, id, index, value) {
    if (!lesson || !Array.isArray(lesson.questions)) return { ok: false, code: 'LESSON_NOT_FOUND' };
    const progress = state.lessonProgress?.[id] || {
      index: 0,
      version: lesson.version,
      questions: JSON.parse(JSON.stringify(lesson.questions)),
    };
    if (progress.index >= progress.questions.length) return { ok: false, code: 'LESSON_COMPLETE' };
    if (index !== progress.index) return { ok: false, code: 'STALE_QUESTION' };
    if (!Number.isInteger(value) || value !== progress.questions[index].correct)
      return { ok: false, code: 'WRONG_ANSWER' };
    progress.index++;
    (state.lessonProgress ??= {})[id] = progress;
    const complete = progress.index === progress.questions.length;
    if (complete) {
      state.album ??= [];
      if (!state.album.includes('knowledge:' + id)) state.album.push('knowledge:' + id);
    }
    return { ok: true, complete, index: progress.index };
  }
  function validProgress(value) {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length > 16
    )
      return false;
    return Object.entries(value).every(
      ([id, p]) =>
        /^[a-z][a-z0-9_]{1,63}$/.test(id) &&
        p &&
        Number.isInteger(p.index) &&
        p.index >= 0 &&
        Number.isInteger(p.version) &&
        p.version >= 1 &&
        Array.isArray(p.questions) &&
        p.questions.length > 0 &&
        p.questions.length <= 16 &&
        p.index <= p.questions.length &&
        p.questions.every(
          (q) =>
            typeof q.question === 'string' &&
            q.question.length <= 500 &&
            Array.isArray(q.choices) &&
            q.choices.length >= 2 &&
            q.choices.length <= 8 &&
            q.choices.every((t) => typeof t === 'string' && t.length <= 300) &&
            Number.isInteger(q.correct) &&
            q.correct >= 0 &&
            q.correct < q.choices.length,
        ),
    );
  }
  const api = { definitions, answer, validProgress };
  if (root.PARISH_DATA) root.PARISH_DATA.lessons = definitions;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PARISH_LESSONS = api;
})(typeof window !== 'undefined' ? window : globalThis);
