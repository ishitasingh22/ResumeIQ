import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileSearch2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import './History.css'

const AnalysisResults = lazy(() => import('../components/AnalysisResults.jsx'))
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

async function requestHistory(path, signal) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to load analysis history.')
  }
  return payload
}

function formatAnalysisDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getRoleLabel(jobDescription) {
  const firstLine = jobDescription.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  if (!firstLine) return 'Resume analysis'
  return firstLine.length > 82 ? `${firstLine.slice(0, 79)}...` : firstLine
}

export function HistoryPage() {
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [pageData, setPageData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    requestHistory(`/resume/history?page=${page}&limit=20`, controller.signal)
      .then((result) => {
        setPageData(result)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })

    return () => controller.abort()
  }, [page, reloadKey])

  const isLoading = !error && pageData?.pagination.page !== page

  return (
    <main className="dashboard-page history-page">
      <header className="history-page-heading">
        <div>
          <span className="page-eyebrow">YOUR ACTIVITY</span>
          <h2>History</h2>
          <p>Past resume-to-role reports, all in one place.</p>
        </div>
        <Link className="primary-action" to="/dashboard/new-analysis">
          <FilePlus2 size={16} /> New analysis
        </Link>
      </header>

      {error && (
        <div className="history-error" role="alert">
          <span>{error}</span>
          <button onClick={() => { setError(''); setReloadKey((key) => key + 1) }} type="button">Try again</button>
        </div>
      )}

      {isLoading && (
        <div aria-label="Loading analysis history" className="history-skeleton-list">
          {[0, 1, 2].map((item) => <span className="history-skeleton" key={item} />)}
        </div>
      )}

      {!isLoading && !error && pageData?.pagination.total === 0 && (
        <section className="section-empty history-empty">
          <span className="section-empty-icon"><FileSearch2 size={23} /></span>
          <h3>No analyses yet.</h3>
          <p>Your completed reports will appear here.</p>
          <Link className="secondary-action" to="/dashboard/new-analysis">
            Create an analysis <ArrowRight size={15} />
          </Link>
        </section>
      )}

      {!isLoading && !error && pageData?.analyses.length > 0 && (
        <>
          <div className="history-list-heading">
            <span>{pageData.pagination.total} {pageData.pagination.total === 1 ? 'report' : 'reports'}</span>
            <span>Sorted by most recent</span>
          </div>
          <section aria-label="Analysis history" className="history-list">
            {pageData.analyses.map((analysis) => (
              <Link className="history-entry" key={analysis.id} to={`/dashboard/history/${analysis.id}`}>
                <span className="history-entry-date"><CalendarDays size={15} />{formatAnalysisDate(analysis.createdAt)}</span>
                <span className="history-entry-main">
                  <strong>{getRoleLabel(analysis.jobDescription)}</strong>
                  <span className="history-entry-description">{analysis.jobDescription}</span>
                  {analysis.missingKeywords.length > 0 && (
                    <span className="history-entry-keywords">
                      {analysis.missingKeywords.slice(0, 3).map((keyword) => <span key={keyword}>{keyword}</span>)}
                      {analysis.missingKeywords.length > 3 && <span>+{analysis.missingKeywords.length - 3}</span>}
                    </span>
                  )}
                </span>
                <span className="history-entry-score"><strong>{analysis.atsScore}</strong><span>% match</span></span>
                <ArrowRight className="history-entry-arrow" size={17} aria-hidden="true" />
              </Link>
            ))}
          </section>

          {pageData.pagination.totalPages > 1 && (
            <nav aria-label="History pages" className="history-pagination">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => current - 1)}
                type="button"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span>Page {page} of {pageData.pagination.totalPages}</span>
              <button
                disabled={page >= pageData.pagination.totalPages || isLoading}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

export function HistoryDetailPage() {
  const { analysisId } = useParams()
  const [detail, setDetail] = useState({ id: null, analysis: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    requestHistory(`/resume/history/${encodeURIComponent(analysisId)}`, controller.signal)
      .then(({ analysis }) => setDetail({ id: analysisId, analysis, error: '' }))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setDetail({ id: analysisId, analysis: null, error: requestError.message })
        }
      })

    return () => controller.abort()
  }, [analysisId])

  const isLoading = detail.id !== analysisId

  if (isLoading) {
    return (
      <main className="dashboard-page history-detail-page">
        <span className="history-skeleton history-detail-skeleton" />
        <span className="history-skeleton history-detail-skeleton" />
      </main>
    )
  }

  if (detail.error || !detail.analysis) {
    return (
      <main className="dashboard-page history-detail-page">
        <Link className="history-back-link" to="/dashboard/history"><ChevronLeft size={16} /> Back to history</Link>
        <div className="history-error" role="alert">
          <span>{detail.error || 'Analysis not found.'}</span>
          <Link to="/dashboard/history">Return to history</Link>
        </div>
      </main>
    )
  }

  const { analysis } = detail

  return (
    <main className="dashboard-page history-detail-page">
      <header className="history-detail-heading">
        <Link className="history-back-link" to="/dashboard/history"><ChevronLeft size={16} /> Back to history</Link>
        <span className="page-eyebrow">SAVED REPORT</span>
        <h2>{getRoleLabel(analysis.jobDescription)}</h2>
        <p>Created {formatAnalysisDate(analysis.createdAt)}</p>
      </header>
      <Suspense fallback={<span className="history-skeleton history-detail-skeleton" />}>
        <AnalysisResults analysis={analysis} />
      </Suspense>
      <section className="history-source-details" aria-label="Source documents">
        <details>
          <summary>Job description</summary>
          <pre>{analysis.jobDescription}</pre>
        </details>
        <details>
          <summary>Resume text</summary>
          <pre>{analysis.resumeText}</pre>
        </details>
      </section>
    </main>
  )
}