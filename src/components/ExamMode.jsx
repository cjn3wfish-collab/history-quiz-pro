import { useState, useMemo, useCallback } from 'react';
import QuestionCard from './QuestionCard';

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 标准化答案用于比较
function normalize(ans) {
  if (!ans) return '';
  return (Array.isArray(ans) ? ans.join('') : ans)
    .split('')
    .sort()
    .join('')
    .toUpperCase();
}

export default function ExamMode({ allQuestions, chapters, onBack, onAddWrong }) {
  const [phase, setPhase] = useState('config');

  // 考试设置
  const [questionCount, setQuestionCount] = useState(20);
  const [isRandom, setIsRandom] = useState(true);
  const [examChapter, setExamChapter] = useState('all');

  // 考试答题状态
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});

  // 按章节筛选的题库池
  const pool = useMemo(() => {
    if (examChapter === 'all') return allQuestions;
    return allQuestions.filter((q) => q.chapter === examChapter);
  }, [allQuestions, examChapter]);

  // 开始考试
  const startExam = useCallback(() => {
    let selected = isRandom ? shuffle(pool) : [...pool];
    const count =
      questionCount === 0 ? selected.length : Math.min(questionCount, selected.length);
    setExamQuestions(selected.slice(0, count));
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted({});
    setPhase('session');
  }, [pool, isRandom, questionCount]);

  const question = examQuestions[currentIndex] || null;
  const total = examQuestions.length;
  const isLast = currentIndex >= total - 1;
  const allSubmitted = total > 0 && examQuestions.every((q) => submitted[q.id]);

  // 实时统计
  const stats = useMemo(() => {
    let correct = 0;
    let done = 0;
    examQuestions.forEach((q) => {
      if (submitted[q.id]) {
        done++;
        const ua = normalize((answers[q.id] || []).join(''));
        const ca = normalize(q.answer);
        if (ua === ca && ua !== '') correct++;
      }
    });
    return { correct, submitted: done };
  }, [examQuestions, submitted, answers]);

  // 选答案
  const handleAnswer = useCallback(
    (qid, ans) => {
      if (submitted[qid]) return;
      setAnswers((prev) => ({ ...prev, [qid]: ans }));
    },
    [submitted]
  );

  // 提交
  const handleSubmit = useCallback(
    (qid) => {
      setSubmitted((prev) => ({ ...prev, [qid]: true }));
      const q = examQuestions.find((x) => x.id === qid);
      if (!q) return;
      const ua = normalize((answers[qid] || []).join(''));
      const ca = normalize(q.answer);
      if (ua !== ca || ua === '') {
        onAddWrong(q, answers[qid] || []);
      }
    },
    [examQuestions, answers, onAddWrong]
  );

  // 下一题
  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, total]);

  // 提前结束
  const handleEnd = useCallback(() => {
    if (!window.confirm('确定要结束考试吗？未作答的题目将计为错误。')) return;
    const newSubmitted = { ...submitted };
    examQuestions.forEach((q) => {
      if (!newSubmitted[q.id]) {
        newSubmitted[q.id] = true;
        onAddWrong(q, []);
      }
    });
    setSubmitted(newSubmitted);
    setPhase('result');
  }, [submitted, examQuestions, onAddWrong]);

  const goResult = useCallback(() => setPhase('result'), []);
  const handleRetry = useCallback(() => setPhase('config'), []);

  // ==================== 配置页 ====================
  if (phase === 'config') {
    return (
      <div className="exam-config">
        <div className="config-card">
          <h2 className="config-title">📝 考试设置</h2>

          <div className="config-item">
            <label className="config-label">题目数量</label>
            <div className="count-options">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  className={`count-btn ${questionCount === n ? 'active' : ''}`}
                  onClick={() => setQuestionCount(n)}
                >
                  {n} 题
                </button>
              ))}
              <button
                className={`count-btn ${questionCount === 0 ? 'active' : ''}`}
                onClick={() => setQuestionCount(0)}
              >
                全部 ({pool.length}题)
              </button>
            </div>
          </div>

          <div className="config-item">
            <label className="config-label">出题模式</label>
            <div className="mode-toggle">
              <button
                className={`toggle-btn ${isRandom ? 'active' : ''}`}
                onClick={() => setIsRandom(true)}
              >
                随机抽题
              </button>
              <button
                className={`toggle-btn ${!isRandom ? 'active' : ''}`}
                onClick={() => setIsRandom(false)}
              >
                顺序出题
              </button>
            </div>
          </div>

          <div className="config-item">
            <label className="config-label">章节范围</label>
            <select
              className="chapter-select"
              value={examChapter}
              onChange={(e) => setExamChapter(e.target.value)}
            >
              {chapters.map((ch) => (
                <option key={ch} value={ch}>
                  {ch === 'all' ? '全部章节' : ch}
                </option>
              ))}
            </select>
          </div>

          <div className="config-actions">
            <button className="btn-back" onClick={onBack}>
              ← 返回
            </button>
            <button
              className="btn-start"
              onClick={startExam}
              disabled={pool.length === 0}
            >
              开始考试
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 结果页 ====================
  if (phase === 'result') {
    const correct = stats.correct;
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const level = accuracy >= 80 ? 'great' : accuracy >= 60 ? 'good' : 'poor';
    const levelLabel = { great: '优秀', good: '良好', poor: '需努力' }[level];

    const wrongQuestions = examQuestions.filter((q) => {
      const ua = normalize((answers[q.id] || []).join(''));
      const ca = normalize(q.answer);
      return ua !== ca || ua === '';
    });

    return (
      <div className="exam-result">
        <h2 className="result-title">📊 考试结果</h2>

        <div className="result-score-area">
          <div className={`score-circle ${level}`}>
            <span className="score-number">{accuracy}</span>
            <span className="score-unit">分</span>
          </div>
          <div className={`score-level ${level}`}>{levelLabel}</div>
        </div>

        <div className="result-stats">
          <div className="stat-card">
            <span className="stat-num">{total}</span>
            <span className="stat-lbl">总题数</span>
          </div>
          <div className="stat-card stat-correct">
            <span className="stat-num">{correct}</span>
            <span className="stat-lbl">正确</span>
          </div>
          <div className="stat-card stat-wrong">
            <span className="stat-num">{wrong}</span>
            <span className="stat-lbl">错误</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{accuracy}%</span>
            <span className="stat-lbl">正确率</span>
          </div>
        </div>

        {wrongQuestions.length > 0 && (
          <div className="wrong-list-section">
            <h3>❌ 错题列表（已自动加入错题本）</h3>
            {wrongQuestions.map((q, i) => {
              const ua = normalize((answers[q.id] || []).join('')) || '未作答';
              const ca = normalize(q.answer);
              return (
                <div key={q.id} className="wrong-item">
                  <div className="wrong-num">{i + 1}</div>
                  <div className="wrong-body">
                    <p className="wrong-q">{q.question}</p>
                    <p>
                      你的答案：<span className="text-red">{ua}</span>
                    </p>
                    <p>
                      正确答案：<span className="text-green">{ca}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {wrongQuestions.length === 0 && (
          <div className="perfect-score">
            🎉 全部正确，满分通过！
          </div>
        )}

        <div className="result-actions">
          <button className="btn-primary" onClick={handleRetry}>
            重新考试
          </button>
          <button className="btn-secondary" onClick={onBack}>
            返回练习模式
          </button>
        </div>
      </div>
    );
  }

  // ==================== 答题页 ====================
  if (!question) {
    return (
      <div className="exam-session">
        <div className="empty-state">
          <p>该章节暂无题目</p>
          <button className="btn-back" onClick={onBack}>← 返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-session">
      {/* 进度条 */}
      <div className="exam-progress">
        <div className="progress-info">
          <span className="pi-item">
            第 <strong>{currentIndex + 1}</strong>/{total} 题
          </span>
          <span className="pi-item">
            已答 <strong>{stats.submitted}</strong> 题
          </span>
          <span className="pi-item">
            正确 <strong>{stats.correct}</strong> 题
          </span>
          {stats.submitted > 0 && (
            <span className="pi-item pi-accuracy">
              正确率{' '}
              <strong>
                {Math.round((stats.correct / stats.submitted) * 100)}%
              </strong>
            </span>
          )}
        </div>
        <div className="progress-bar-track">
          {examQuestions.map((q, i) => {
            let cls = 'pb-segment';
            if (i === currentIndex) cls += ' current';
            if (submitted[q.id]) {
              const ua = normalize((answers[q.id] || []).join(''));
              const ca = normalize(q.answer);
              cls += ua === ca ? ' correct' : ' wrong';
            }
            return (
              <div
                key={q.id}
                className={cls}
                style={{ width: `${100 / total}%` }}
              />
            );
          })}
        </div>
        <div className="step-indicators">
          {examQuestions.map((q, i) => {
            let cls = 'step-dot';
            if (i === currentIndex) cls += ' current';
            else if (submitted[q.id]) {
              const ua = normalize((answers[q.id] || []).join(''));
              const ca = normalize(q.answer);
              cls += ua === ca ? ' done-correct' : ' done-wrong';
            }
            return <div key={q.id} className={cls} />;
          })}
        </div>
      </div>

      {/* 题目卡片 */}
      <QuestionCard
        key={question.id}
        question={question}
        userAnswer={answers[question.id] || []}
        submitted={!!submitted[question.id]}
        onAnswer={(ans) => handleAnswer(question.id, ans)}
        onSubmit={() => handleSubmit(question.id)}
      />

      {/* 提交结果 */}
      {submitted[question.id] && (
        <div className="result">
          {(() => {
            const ua = normalize((answers[question.id] || []).join(''));
            const ca = normalize(question.answer);
            const ok = ua === ca && ua !== '';
            return (
              <>
                <div className={`result-badge ${ok ? 'correct' : 'wrong'}`}>
                  {ok ? '✓ 回答正确' : '✗ 回答错误'}
                </div>
                {!ok && (
                  <div className="result-detail">
                    <p>
                      <strong>你的答案：</strong>
                      <span className="text-red">{ua || '未作答'}</span>
                    </p>
                    <p>
                      <strong>正确答案：</strong>
                      <span className="text-green">{ca}</span>
                    </p>
                  </div>
                )}
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

      {/* 导航按钮 */}
      <div className="exam-nav">
        {!allSubmitted && (
          <button className="btn-end-exam" onClick={handleEnd}>
            ⏹ 结束考试
          </button>
        )}

        <div className="exam-nav-right">
          {submitted[question.id] && !isLast && (
            <button className="btn-next" onClick={handleNext}>
              下一题 →
            </button>
          )}

          {allSubmitted && (
            <button className="btn-view-result" onClick={goResult}>
              查看结果 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
