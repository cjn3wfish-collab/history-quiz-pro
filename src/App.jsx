import { useState, useMemo, useCallback } from 'react';
import questions from './data/history.json';
import QuestionCard from './components/QuestionCard';
import ExamMode from './components/ExamMode';
import WrongBook from './components/WrongBook';
import './App.css';

// 标准化答案用于比较
function normalize(ans) {
  if (!ans) return '';
  return (Array.isArray(ans) ? ans.join('') : ans)
    .split('')
    .sort()
    .join('')
    .toUpperCase();
}

function App() {
  const [mode, setMode] = useState('practice'); // 'practice' | 'exam' | 'wrongbook'

  // ========== 练习模式状态 ==========
  const [chapter, setChapter] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});

  // ========== 错题本状态 ==========
  const [wrongBook, setWrongBook] = useState([]);

  // 所有章节
  const chapters = useMemo(() => {
    const set = new Set();
    questions.forEach((q) => set.add(q.chapter));
    return ['all', ...Array.from(set)];
  }, []);

  // 按章节筛选
  const filtered = useMemo(() => {
    if (chapter === 'all') return questions;
    return questions.filter((q) => q.chapter === chapter);
  }, [chapter]);

  // 当前题目
  const question = filtered[currentIndex] || null;

  // ---------- 错题本操作 ----------
  const addToWrongBook = useCallback((q, userAnswer) => {
    setWrongBook((prev) => {
      if (prev.find((w) => w.id === q.id)) return prev;
      return [
        ...prev,
        {
          id: q.id,
          question: q.question,
          options: q.options,
          answer: q.answer,
          type: q.type,
          chapter: q.chapter,
          userAnswer: userAnswer || [],
          explanation: q.explanation,
        },
      ];
    });
  }, []);

  const removeFromWrongBook = useCallback((qid) => {
    setWrongBook((prev) => prev.filter((w) => w.id !== qid));
  }, []);

  // ---------- 练习模式操作 ----------
  const handleChapterChange = useCallback((ch) => {
    setChapter(ch);
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmitted({});
  }, []);

  const handleAnswer = useCallback(
    (qid, answer) => {
      if (submitted[qid]) return;
      setUserAnswers((prev) => ({ ...prev, [qid]: answer }));
    },
    [submitted]
  );

  const handleSubmit = useCallback(
    (qid) => {
      setSubmitted((prev) => ({ ...prev, [qid]: true }));
      // 如果答错，加入错题本；答对则移除
      const q = questions.find((x) => x.id === qid);
      if (!q) return;
      const ua = normalize(userAnswers[qid] || []);
      const ca = normalize(q.answer);
      if (ua === ca && ua !== '') {
        // 答对，从错题本移除
        setWrongBook((prev) => prev.filter((w) => w.id !== qid));
      } else {
        // 答错，加入错题本
        setWrongBook((prev) => {
          if (prev.find((w) => w.id === qid)) return prev;
          return [
            ...prev,
            {
              id: q.id,
              question: q.question,
              options: q.options,
              answer: q.answer,
              type: q.type,
              chapter: q.chapter,
              userAnswer: userAnswers[qid] || [],
              explanation: q.explanation,
            },
          ];
        });
      }
    },
    [userAnswers, questions]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < filtered.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, filtered.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleJump = useCallback((index) => {
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 练习模式统计
  const stats = useMemo(() => {
    let correct = 0;
    let done = 0;
    filtered.forEach((q) => {
      if (submitted[q.id]) {
        done++;
        const ua = normalize(userAnswers[q.id] || []);
        const ca = normalize(q.answer);
        if (ua === ca) correct++;
      }
    });
    return { correct, total: filtered.length, submitted: done };
  }, [filtered, submitted, userAnswers]);

  // ========== 错题本视图 ==========
  if (mode === 'wrongbook') {
    return (
      <div className="app">
        <TopBar
          mode={mode}
          wrongCount={wrongBook.length}
          onModeChange={setMode}
        />
        <WrongBook
          wrongBook={wrongBook}
          chapters={chapters}
          onRemove={removeFromWrongBook}
          onClose={() => setMode('practice')}
        />
      </div>
    );
  }

  // ========== 考试模式 ==========
  if (mode === 'exam') {
    return (
      <div className="app">
        <TopBar
          mode={mode}
          wrongCount={wrongBook.length}
          onModeChange={setMode}
        />
        <ExamMode
          allQuestions={questions}
          chapters={chapters}
          onBack={() => setMode('practice')}
          onAddWrong={addToWrongBook}
        />
      </div>
    );
  }

  // ========== 练习模式 ==========
  if (!question) {
    return (
      <div className="app">
        <TopBar
          mode={mode}
          wrongCount={wrongBook.length}
          onModeChange={setMode}
        />
        <div className="empty-state">
          <p>该章节暂无题目</p>
          <button onClick={() => handleChapterChange('all')}>查看全部题目</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        mode={mode}
        wrongCount={wrongBook.length}
        onModeChange={setMode}
      />

      <div className="toolbar">
        <select
          className="chapter-select"
          value={chapter}
          onChange={(e) => handleChapterChange(e.target.value)}
        >
          {chapters.map((ch) => (
            <option key={ch} value={ch}>
              {ch === 'all' ? '全部章节' : ch}
            </option>
          ))}
        </select>

        <div className="stats">
          进度：{stats.submitted}/{stats.total}
          {stats.submitted > 0 && (
            <span className="correct-rate">
              正确率：{Math.round((stats.correct / stats.submitted) * 100)}%
            </span>
          )}
        </div>
      </div>

      <QuestionCard
        key={question.id}
        question={question}
        userAnswer={userAnswers[question.id] || []}
        submitted={!!submitted[question.id]}
        onAnswer={(ans) => handleAnswer(question.id, ans)}
        onSubmit={() => handleSubmit(question.id)}
      />

      {submitted[question.id] && (
        <div className="result">
          {(() => {
            const ua = normalize(userAnswers[question.id] || []);
            const ca = normalize(question.answer);
            const ok = ua === ca && ua !== '';
            return (
              <>
                <div className={`result-badge ${ok ? 'correct' : 'wrong'}`}>
                  {ok ? '✓ 回答正确' : '✗ 回答错误'}
                </div>
                <div className="result-detail">
                  <p>
                    <strong>你的答案：</strong>
                    <span className={ok ? 'text-green' : 'text-red'}>
                      {ua || '未作答'}
                    </span>
                  </p>
                  <p>
                    <strong>正确答案：</strong>
                    <span className="text-green">{ca}</span>
                  </p>
                </div>
                {question.explanation && (
                  <div className="explanation">
                    <strong>解析：</strong>
                    {question.explanation}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      <div className="navigation">
        <button
          className="nav-btn"
          disabled={currentIndex === 0}
          onClick={handlePrev}
        >
          ← 上一题
        </button>
        <span className="nav-info">
          {currentIndex + 1} / {filtered.length}
        </span>
        <button
          className="nav-btn"
          disabled={currentIndex >= filtered.length - 1}
          onClick={handleNext}
        >
          下一题 →
        </button>
      </div>

      {/* 题号导航 */}
      <div className="question-numbers">
        <p className="numbers-title">题号导航（点击跳转）</p>
        <div className="numbers-grid">
          {filtered.map((q, idx) => {
            let cls = 'number-dot';
            if (idx === currentIndex) cls += ' current';
            if (submitted[q.id]) {
              const ua = normalize(userAnswers[q.id] || []);
              const ca = normalize(q.answer);
              cls += ua === ca ? ' correct' : ' wrong';
            }
            return (
              <button
                key={q.id}
                className={cls}
                onClick={() => handleJump(idx)}
                title={`第 ${idx + 1} 题`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== 顶部导航栏 ==========
function TopBar({ mode, wrongCount, onModeChange }) {
  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <h1 className="top-title">中国近现代史纲要 · 考试系统</h1>
        <nav className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'practice' ? 'active' : ''}`}
            onClick={() => onModeChange('practice')}
          >
            Practice
          </button>
          <button
            className={`mode-tab ${mode === 'exam' ? 'active' : ''}`}
            onClick={() => onModeChange('exam')}
          >
            Exam
          </button>
          <button
            className={`mode-tab ${mode === 'wrongbook' ? 'active' : ''}`}
            onClick={() => onModeChange('wrongbook')}
          >
            Review
            {wrongCount > 0 && (
              <span className="wrong-badge">{wrongCount}</span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

export default App;
