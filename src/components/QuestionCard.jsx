const TYPE_LABELS = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
};

// 对答案字符串排序去大写
function normalizeAnswer(ans) {
  if (!ans) return '';
  return ans.split('').sort().join('').toUpperCase();
}

export default function QuestionCard({
  question,
  userAnswer,
  submitted,
  onAnswer,
  onSubmit,
}) {
  const type = question.type || 'single';
  const options = question.options || {};
  const optionKeys = Object.keys(options).sort();
  const isMultiple = type === 'multiple';

  // 当前值的标准化（大写）
  const selectedSet = new Set(userAnswer.map((a) => a.toUpperCase()));

  const handleChange = (key) => {
    if (submitted) return;
    if (isMultiple) {
      const upperKey = key.toUpperCase();
      const next = selectedSet.has(upperKey)
        ? userAnswer.filter((a) => a.toUpperCase() !== upperKey)
        : [...userAnswer, key];
      onAnswer(next);
    } else {
      onAnswer([key]);
    }
  };

  const canSubmit = userAnswer.length > 0 && !submitted;

  // 判断答案是否正确
  let isCorrect = null;
  if (submitted) {
    const userAns = normalizeAnswer(userAnswer.join(''));
    const correctAns = normalizeAnswer(question.answer);
    isCorrect = userAns === correctAns && userAns !== '';
  }

  return (
    <div className={`question-card ${submitted ? (isCorrect ? 'card-correct' : 'card-wrong') : ''}`}>
      <div className="card-header">
        <span className={`type-badge type-${type}`}>
          {TYPE_LABELS[type] || type}
        </span>
        {question.chapter && (
          <span className="chapter-badge">{question.chapter}</span>
        )}
      </div>

      <h2 className="question-text">{question.question}</h2>

      <div className="options-list">
        {optionKeys.map((key) => {
          const checked = selectedSet.has(key.toUpperCase());
          let optClass = 'option-item';
          if (submitted) {
            const correctAns = normalizeAnswer(question.answer);
            const isKeyCorrect = correctAns.includes(key.toUpperCase());
            if (checked && isKeyCorrect) optClass += ' opt-correct';
            else if (checked && !isKeyCorrect) optClass += ' opt-wrong';
            else if (!checked && isKeyCorrect) optClass += ' opt-missed';
          }

          return (
            <label key={key} className={optClass}>
              <input
                type={isMultiple ? 'checkbox' : 'radio'}
                name={`q-${question.id}`}
                checked={checked}
                onChange={() => handleChange(key)}
                disabled={submitted}
              />
              <span className="option-key">{key.toUpperCase()}</span>
              <span className="option-text">{options[key]}</span>
            </label>
          );
        })}
      </div>

      {!submitted && (
        <button
          className="submit-btn"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          提交答案
        </button>
      )}
    </div>
  );
}
