import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, LoaderCircle, MessageCircleQuestion, RefreshCw, Sparkles } from 'lucide-react'
import './Interview.css'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const MAX_JOB_DESCRIPTION_LENGTH = 30_000

export default function InterviewPrepPage() {
  const [role, setRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [questions, setQuestions] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [difficultyFilter, setDifficultyFilter] = useState('All')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  async function generateQuestions() {
    if (isGenerating) return
    if (!role.trim() && !jobDescription.trim()) {
      setError('Add a role or job description to generate questions.')
      return
    }
    if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      setError('The job description must be 30,000 characters or fewer.')
      return
    }

    setError('')
    setQuestions([])
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_BASE}/interview/questions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, jobDescription }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to generate questions. Please try again.')
      }
      setQuestions(payload.questions)
      setCategoryFilter('All')
      setDifficultyFilter('All')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    generateQuestions()
  }

  const visibleQuestions = questions.filter((question) =>
    (categoryFilter === 'All' || question.category === categoryFilter) &&
    (difficultyFilter === 'All' || question.difficulty === difficultyFilter),
  )

  return (
    <main className="dashboard-page section-page interview-page">
      <header className="interview-page-heading">
        <div>
          <span className="page-eyebrow">PRACTICE WITH PURPOSE</span>
          <h2>Interview prep</h2>
          <p>Build a focused question set for the role you want.</p>
        </div>
        <span className="interview-heading-mark"><MessageCircleQuestion size={22} /></span>
      </header>

      <form className="interview-form" onSubmit={handleSubmit}>
        <div className="interview-input-grid">
          <label className="analysis-card interview-role-card">
            <span className="interview-field-heading">
              <span className="step-number">01</span>
              <span><strong>Role</strong><small>Optional when you add a job description</small></span>
            </span>
            <input
              autoComplete="organization-title"
              className="interview-role-input"
              maxLength={160}
              onChange={(event) => setRole(event.target.value)}
              placeholder="e.g. Senior product designer"
              value={role}
            />
          </label>

          <label className="analysis-card interview-jd-card">
            <span className="interview-field-heading">
              <span className="step-number">02</span>
              <span><strong>Job description</strong><small>Paste the responsibilities and requirements</small></span>
            </span>
            <textarea
              className="job-description-input"
              maxLength={MAX_JOB_DESCRIPTION_LENGTH}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Add the job description…"
              value={jobDescription}
            />
            <span className="interview-character-count">{jobDescription.length.toLocaleString()} / 30,000</span>
          </label>
        </div>

        {error && <p className="analysis-error" role="alert">{error}</p>}

        <div className="interview-submit-row">
          <span><Sparkles size={15} /> Questions are tailored to your role details.</span>
          <button className="primary-action" disabled={isGenerating} type="submit">
            {isGenerating
              ? <LoaderCircle className="spinner" size={16} />
              : questions.length > 0
                ? <RefreshCw size={16} />
                : <MessageCircleQuestion size={16} />}
            {isGenerating ? 'Generating questions…' : questions.length > 0 ? 'Regenerate questions' : 'Generate questions'}
          </button>
        </div>
      </form>

      {isGenerating && (
        <section className="interview-loading" aria-live="polite">
          <span className="scanning-indicator"><LoaderCircle className="spinner" size={17} /> Building your question set</span>
          {[0, 1, 2].map((item) => <span className="interview-skeleton" key={item} />)}
        </section>
      )}

      {questions.length > 0 && !isGenerating && (
        <motion.section
          aria-label="Generated interview questions"
          className="interview-results"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <header className="interview-results-header">
            <div>
              <span className="page-eyebrow">YOUR QUESTION SET</span>
              <h3>{visibleQuestions.length} questions</h3>
            </div>
            <div className="interview-filter-stack">
              <div aria-label="Filter by question category" className="interview-category-tabs" role="tablist">
                {['All', 'Behavioral', 'Technical', 'Role-specific'].map((category) => (
                  <button
                    aria-selected={categoryFilter === category}
                    className={categoryFilter === category ? 'active' : ''}
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    role="tab"
                    type="button"
                  >
                    {category === 'All' ? 'All' : category}
                    {categoryFilter === category && (
                      <motion.span className="interview-category-underline" layoutId="interview-category-underline" />
                    )}
                  </button>
                ))}
              </div>
              <div aria-label="Filter by difficulty" className="interview-difficulty-pills" role="group">
                {['All', 'Easy', 'Medium', 'Hard'].map((difficulty) => (
                  <button
                    aria-pressed={difficultyFilter === difficulty}
                    className={difficultyFilter === difficulty ? 'active' : ''}
                    key={difficulty}
                    onClick={() => setDifficultyFilter(difficulty)}
                    type="button"
                  >
                    {difficulty !== 'All' && <span className={`difficulty-dot dot-${difficulty.toLowerCase()}`} />}
                    {difficulty === 'All' ? 'All levels' : difficulty}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {visibleQuestions.length > 0 ? (
            <div className="interview-question-list">
              {visibleQuestions.map((question, index) => (
                <details className="interview-question" key={`${question.category}-${question.question}`}>
                  <summary>
                    <span className="interview-question-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className={`interview-category category-${question.category.toLowerCase()}`}>{question.category}</span>
                    <span className={`interview-difficulty difficulty-${question.difficulty.toLowerCase()}`}>
                      <span className={`difficulty-dot dot-${question.difficulty.toLowerCase()}`} />
                      {question.difficulty}
                    </span>
                    <strong>{question.question}</strong>
                    <ChevronDown size={17} aria-hidden="true" />
                  </summary>
                  <div className="interview-answer-grid">
                    <section>
                      <span>WHAT THEY'RE TESTING</span>
                      <p>{question.interviewerIntent}</p>
                    </section>
                    <section>
                      <span>SAMPLE STRONG ANSWER</span>
                      <p>{question.sampleAnswer}</p>
                    </section>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="interview-no-results">No questions match these filters.</p>
          )}
        </motion.section>
      )}
    </main>
  )
}