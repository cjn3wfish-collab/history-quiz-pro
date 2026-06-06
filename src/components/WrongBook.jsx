import { useState, useMemo, useCallback } from 'react';
import QuestionCard from './QuestionCard';

// 标准化答案用于比较
function normalize(ans) {
  if (!ans) return '';
  return (Array.isArray(ans) ? ans.join('') : ans)
    .split('')
    .sort()
    .join('')
    .toUpperCase();
}

export default function WrongBook({ wrongBook, chapters, onRemove, onClose }) {
  const [filterChapter, setFilterChapter] = useState('all');
  const [reviewingId, setReviewingId] = useState(null);

  // 需要复习的错题
  const reviewing = useMemo(
    () => wrongBook.find((w) => w.id === reviewingId) || null,
    [wrongBook, reviewingId]
  );

  // 按章节筛选
  const filtered = useMemo(() => {
    if (filterChapter === 'all') return wrongBook;
    return wrongBook.filter((w) => w.chapter === filterChapter);
  }, [wrongBook, filterChapter]);

  // 错题章节
  const wbChapters = useMemo(() => {
    const s = new Set(wrongBook.map((w) => w.chapter));
    return ['all', ...Array.from(s)];
  }, [wrongBook]);

  // ========== 复习单道错题 ==========
  if (reviewing) {
    return (
      <ReAnswerView
        question={reviewing}
        onBack={() => setReviewingId(null)}
        onCorrect={() => {
          onRemove(reviewing.id);
          setReviewingId(null);
        }}
      />
    );
  }

  // ========== 错题列表 ==========
  return (
    <div className="wrong-book">
      <div className="wb-header">
        <button className="btn-back" onClick={onClose}>
          ← 返回
        </button>
        <h2>📕 错题本</h2>
        <select
          className="chapter-select"
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
        >
          {wbChapters.map((ch) => (
            <option key={ch} value={ch}>
              {ch === 'all' ? '全部章节' : ch}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="wb-empty">
          <div className="wb-empty-icon">🎉</div>
          <p>
            {wrongBook.length === 0
              ? '错题本为空，继续保持！'
              : '该章节没有错题'}
          </p>
        </div>
      ) : (
        <>
          <p className="wb-count">
            共 {filtered.length} 道错题
            {filterChapter === 'all' && wrongBook.length > 0
              ? `（总计 ${wrongBook.length} 道）`
              : ''}
          </p>
          <div className="wb-list">
            {filtered.map((w, i) => {
              const ua = normalize(w.userAnswer.join('')) || '未作答';
              const ca = normalize(w.answer);
              return (
                <div
                  key={w.id}
                  className="wb-item"
                  onClick={() => setReviewingId(w.id)}
                >
                  <div className="wb-num">{i + 1}</div>
                  <div className="wb-body">
                    <p className="wb-question">{w.question}</p>
                    <div className="wb-answers">
                      <span className="wb-wrong-ans">
                        你的答案：<span className="text-red">{ua}</span>
                      </span>
                      <span className="wb-correct-ans">
                        正确：<span className="text-green">{ca}</span>
                      </span>
                    </div>
                  </div>
                  <div className="wb-arrow">›</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ========== 错题重做视图 ==========
function ReAnswerView({ question, onBack, onCorrect }) {
  const [answer, setAnswer] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    const ua = normalize(answer.join(''));
    const ca = normalize(question.answer);
    const ok = ua === ca && ua !== '';
    setIsCorrect(ok);
    if (ok) {
      setTimeout(() => onCorrect(), 1200);
    }
  }, [answer, question.answer, onCorrect]);

  return (
    <div className="wb-review">
      <button className="btn-back" onClick={onBack}>
        ← 返回错题列表
      </button>

      <QuestionCard
        key={question.id}
        question={question}
        userAnswer={answer}
        submitted={submitted}
        onAnswer={(ans) => !submitted && setAnswer(ans)}
        onSubmit={handleSubmit}
      />

      {submitted && (
        <div className="result">
          {isCorrect ? (
            <>
              <div className="result-badge correct">
                ✓ 回答正确！已从错题本移除
              </div>
            </>
          ) : (
            <>
              <div className="result-badge wrong">
                ✗ 仍然错误，请继续努力
              </div>
              <div className="result-detail">
                <p>
                  <strong>你的答案：</strong>
                  <span className="text-red">
                    {normalize(answer.join('')) || '未作答'}
                  </span>
                </p>
                <p>
                  <strong>正确答案：</strong>
                  <span className="text-green">
                    {normalize(question.answer)}
                  </span>
                </p>
              </div>
              {question.explanation && (
                <div className="explanation">
                  <strong>解析：</strong>
                  {question.explanation}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
