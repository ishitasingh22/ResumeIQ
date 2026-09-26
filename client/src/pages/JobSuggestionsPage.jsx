import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, BriefcaseBusiness, MapPin, Search, Sparkles } from 'lucide-react'
import './Jobs.css'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const JobMatchBadge = lazy(() => import('../components/JobMatchBadge.jsx'))

async function readResponse(response, fallback) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || fallback)
  }
  return payload
}

function JobCard({ job, isSaved, isSaving, onToggleSaved }) {
  return (
    <article className="job-card">
      <div className="job-card-topline">
        <span className="job-company-mark"><BriefcaseBusiness size={18} /></span>
        <span className="job-company">{job.company}</span>
        <motion.button
          aria-label={isSaved ? `Remove ${job.title} from saved roles` : `Save ${job.title}`}
          aria-pressed={isSaved}
          className={`job-save-button${isSaved ? ' is-saved' : ''}`}
          disabled={isSaving}
          onClick={() => onToggleSaved(job)}
          title={isSaved ? 'Remove saved role' : 'Save role'}
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: -25 }}
              initial={{ opacity: 0, scale: 0.6, rotate: 25 }}
              key={isSaved ? 'saved' : 'unsaved'}
              transition={{ duration: 0.16 }}
            >
              {isSaved ? <BookmarkCheck size={18} fill="currentColor" /> : <Bookmark size={18} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <span className="job-sample-label">SAMPLE LISTING</span>
      <h3>{job.title}</h3>
      <div className="job-location"><MapPin size={14} /> {job.location}</div>

      <div className="job-card-footer">
        <div className="job-tags">
          {job.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <Suspense fallback={<span className="job-match-fallback">{job.matchPercent}%</span>}>
          <JobMatchBadge score={job.matchPercent} />
        </Suspense>
      </div>
    </article>
  )
}

export default function JobSuggestionsPage() {
  const [role, setRole] = useState('')
  const [activeRole, setActiveRole] = useState('')
  const [jobs, setJobs] = useState([])
  const [savedJobs, setSavedJobs] = useState([])
  const [activeTab, setActiveTab] = useState('suggestions')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [savingJobId, setSavingJobId] = useState('')
  const [savedError, setSavedError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savedReload, setSavedReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_BASE}/jobs/saved`, { credentials: 'include', signal: controller.signal })
      .then((response) => readResponse(response, 'Unable to load saved roles.'))
      .then(({ savedJobs: loadedJobs }) => {
        setSavedJobs(loadedJobs)
        setSavedError('')
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setSavedError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSaved(false)
      })

    return () => controller.abort()
  }, [savedReload])

  async function searchJobs(event) {
    event.preventDefault()
    const searchRole = role.trim()
    if (!searchRole) {
      setError('Enter a role to find sample recommendations.')
      return
    }

    setError('')
    setNotice('')
    setActiveRole(searchRole)
    setActiveTab('suggestions')
    setIsSearching(true)
    try {
      const query = new URLSearchParams({ role: searchRole })
      const response = await fetch(`${API_BASE}/jobs/suggestions?${query}`, { credentials: 'include' })
      const payload = await readResponse(response, 'Unable to load role suggestions.')
      setJobs(payload.jobs)
    } catch (requestError) {
      setError(requestError.message)
      setJobs([])
    } finally {
      setIsSearching(false)
    }
  }

  async function toggleSaved(job) {
    const savedJob = savedJobs.find((saved) => saved.jobId === job.id)
    setSavingJobId(job.id)
    setSavedError('')
    setNotice('')

    try {
      if (savedJob) {
        const response = await fetch(`${API_BASE}/jobs/saved/${encodeURIComponent(job.id)}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!response.ok) {
          await readResponse(response, 'Unable to remove this saved role.')
        }
        setSavedJobs((current) => current.filter((item) => item.jobId !== job.id))
        setNotice('Role removed from your saved list.')
      } else {
        const response = await fetch(`${API_BASE}/jobs/saved`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            location: job.location,
            role: job.role,
            matchPercent: job.matchPercent,
            link: job.link,
          }),
        })
        const payload = await readResponse(response, 'Unable to save this role.')
        setSavedJobs((current) => [payload.savedJob, ...current.filter((item) => item.jobId !== job.id)])
        setNotice('Role saved to your list.')
      }
    } catch (requestError) {
      setSavedError(requestError.message)
    } finally {
      setSavingJobId('')
    }
  }

  const displayedJobs = activeTab === 'saved'
    ? savedJobs.map((job) => ({
      id: job.jobId,
      title: job.jobTitle,
      company: job.company,
      location: job.location,
      matchPercent: job.matchPercent,
      tags: [],
      role: job.role,
      link: job.link,
    }))
    : jobs

  return (
    <main className="dashboard-page jobs-page">
      <header className="jobs-page-heading">
        <div>
          <span className="page-eyebrow">OPPORTUNITIES</span>
          <h2>Job suggestions</h2>
          <p>Explore role directions that match your search.</p>
        </div>
        <span className="jobs-heading-mark"><BriefcaseBusiness size={22} /></span>
      </header>

      <form className="jobs-search-form" onSubmit={searchJobs}>
        <label htmlFor="job-role-search">Role or title</label>
        <div className="jobs-search-row">
          <input
            id="job-role-search"
            maxLength={80}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Product Designer"
            value={role}
          />
          <button className="primary-action" disabled={isSearching} type="submit">
            <Search size={16} /> {isSearching ? 'Searching…' : 'Find roles'}
          </button>
        </div>
        <span className="jobs-source-note"><Sparkles size={13} /> Sample listings; not live vacancies.</span>
      </form>

      {error && <p className="jobs-error" role="alert">{error}</p>}
      {notice && <p className="jobs-notice" aria-live="polite">{notice}</p>}

      <div className="jobs-tabs" role="tablist" aria-label="Job lists">
        <button
          aria-selected={activeTab === 'suggestions'}
          className={activeTab === 'suggestions' ? 'active' : ''}
          onClick={() => setActiveTab('suggestions')}
          role="tab"
          type="button"
        >
          Suggestions <span>{jobs.length}</span>
        </button>
        <button
          aria-selected={activeTab === 'saved'}
          className={activeTab === 'saved' ? 'active' : ''}
          onClick={() => setActiveTab('saved')}
          role="tab"
          type="button"
        >
          Saved <span>{savedJobs.length}</span>
        </button>
      </div>

      {activeTab === 'suggestions' && activeRole && jobs.length > 0 && (
        <div className="jobs-results-heading">
          <span>Sample role matches for</span>
          <strong>{activeRole}</strong>
        </div>
      )}

      {activeTab === 'saved' && savedError && (
        <div className="jobs-error" role="alert">
          <span>{savedError}</span>
          <button onClick={() => { setIsLoadingSaved(true); setSavedReload((value) => value + 1) }} type="button">Retry</button>
        </div>
      )}

      {((activeTab === 'saved' && isLoadingSaved) || (activeTab === 'suggestions' && isSearching)) && (
        <div className="job-card-grid" aria-label="Loading job suggestions">
          {[0, 1, 2].map((item) => <span className="job-card-skeleton" key={item} />)}
        </div>
      )}

      {activeTab === 'suggestions' && !isSearching && jobs.length === 0 && (
        <section className="jobs-empty">
          <span><Search size={21} /></span>
          <h3>Search for a role</h3>
          <p>Sample recommendations will appear here.</p>
        </section>
      )}

      {activeTab === 'saved' && !isLoadingSaved && !savedError && savedJobs.length === 0 && (
        <section className="jobs-empty">
          <span><Bookmark size={21} /></span>
          <h3>No saved roles yet</h3>
          <p>Save a sample listing to build your shortlist.</p>
          <button onClick={() => setActiveTab('suggestions')} type="button">Browse suggestions</button>
        </section>
      )}

      {!isSearching && displayedJobs.length > 0 && (
        <section aria-label={activeTab === 'saved' ? 'Saved roles' : 'Role suggestions'} className="job-card-grid">
          {displayedJobs.map((job) => (
            <JobCard
              isSaved={savedJobs.some((saved) => saved.jobId === job.id)}
              isSaving={savingJobId === job.id}
              job={job}
              key={job.id}
              onToggleSaved={toggleSaved}
            />
          ))}
        </section>
      )}
    </main>
  )
}