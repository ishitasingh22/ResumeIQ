import { lazy, Suspense, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BriefcaseBusiness, FilePlus2, FileSearch2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import './DashboardHome.css'

const DashboardVisuals = lazy(() => import('../components/DashboardVisuals.jsx'))
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

function roleFromDescription(description = '') {
  return description.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || 'Resume analysis'
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

export default function DashboardHome() {
  const { user } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const [history, setHistory] = useState({ analyses: [], pagination: null, loading: true })

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_BASE}/resume/history?page=1&limit=6`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.message || 'Unable to load recent analyses.')
        return payload
      })
      .then((payload) => {
        setHistory({ ...payload, loading: false })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setHistory({ analyses: [], pagination: null, loading: false })
        }
      })

    return () => controller.abort()
  }, [])

  const analyses = history.analyses || []
  const totalAnalyses = history.pagination?.total || 0
  const averageScore = analyses.length
    ? Math.round(analyses.reduce((sum, item) => sum + item.atsScore, 0) / analyses.length)
    : null
  const scoreHistory = analyses.slice(0, 6).map((item) => item.atsScore).reverse()

  return (
    <motion.main className="dashboard-page dashboard-home" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="dashboard-home-heading">
        <div>
          <span className="page-eyebrow">YOUR CAREER, IN FOCUS</span>
          <h2>Welcome back, {firstName}</h2>
          <p>A clearer read on where your next move can take you.</p>
        </div>
        <span className="dashboard-date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span>
      </header>

      <section aria-label="Career dashboard" className="dashboard-bento">
        <motion.article className="bento-card quick-analyze-bento" whileHover={{ y: -4, scale: 1.008 }} transition={{ duration: 0.18 }}>
          <div className="quick-card-content">
            <span className="quick-card-eyebrow"><Sparkles size={14} /> CAREER SIGNAL</span>
            <h3>Put your next opportunity in focus.</h3>
            <p>See how your experience maps to the role you want, then get practical ways to strengthen your story.</p>
            <Link className="quick-analyze-action" to="/dashboard/new-analysis">
              <FilePlus2 size={17} /> Start an analysis <ArrowRight size={16} />
            </Link>
          </div>
          <div className="quick-card-orbit" aria-hidden="true">
            <span className="orbit-ring orbit-ring-one" />
            <span className="orbit-ring orbit-ring-two" />
            <span className="orbit-core"><FileSearch2 size={25} /></span>
          </div>
        </motion.article>

        <motion.article className="bento-card insight-bento" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
          <div className="bento-card-heading">
            <span className="bento-icon"><FileSearch2 size={17} /></span>
            <span>YOUR SIGNAL</span>
          </div>
          <div className="insight-stats-row">
            <div>
              <span className="bento-stat-label">Total analyses</span>
              <strong className="bento-stat-value">{history.loading ? '—' : totalAnalyses}</strong>
            </div>
            <div className="insight-score">
              <span className="bento-stat-label">Recent ATS avg.</span>
              <strong className="bento-stat-value">{averageScore === null ? '—' : `${averageScore}%`}</strong>
            </div>
          </div>
          {history.loading ? (
            <div className="sparkline-placeholder" />
          ) : averageScore !== null ? (
            <Suspense fallback={<div className="sparkline-placeholder" />}>
              <DashboardVisuals score={averageScore} scores={scoreHistory} />
            </Suspense>
          ) : (
            <div className="insight-empty">Your first score will start a trend.</div>
          )}
        </motion.article>

        <motion.article className="bento-card activity-bento" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
          <div className="bento-section-heading">
            <div>
              <span className="bento-card-overline">RECENT ACTIVITY</span>
              <h3>Latest analyses</h3>
            </div>
            <Link className="bento-text-link" to="/dashboard/history">View all <ArrowRight size={14} /></Link>
          </div>
          {history.loading ? (
            <div className="activity-loading"><span /><span /><span /></div>
          ) : analyses.length ? (
            <div className="activity-list">
              {analyses.slice(0, 4).map((analysis) => (
                <Link className="activity-row" key={analysis.id} to={`/dashboard/history/${analysis.id}`}>
                  <span className="activity-row-icon"><FileSearch2 size={15} /></span>
                  <span className="activity-row-copy">
                    <strong>{roleFromDescription(analysis.jobDescription)}</strong>
                    <span>{formatDate(analysis.createdAt)}</span>
                  </span>
                  <span className="activity-row-score">{analysis.atsScore}%</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="activity-empty">
              <span>Your reports will appear here after your first analysis.</span>
              <Link to="/dashboard/new-analysis">Create one <ArrowRight size={14} /></Link>
            </div>
          )}
        </motion.article>

        <motion.article className="bento-card next-move-bento" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
          <span className="bento-card-overline">KEEP MOVING</span>
          <h3>Prepare for the conversation.</h3>
          <p>Turn a role description into focused interview practice.</p>
          <Link className="next-move-link" to="/dashboard/interview-prep">
            Open interview prep <ArrowRight size={15} />
          </Link>
          <span className="next-move-decoration" aria-hidden="true"><BriefcaseBusiness size={27} /></span>
        </motion.article>
      </section>
    </motion.main>
  )
}