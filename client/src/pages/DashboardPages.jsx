import { lazy, Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  FileCheck2,
  FileSearch2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Upload,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/useAuth.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_JOB_DESCRIPTION_LENGTH = 30_000
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const AnalysisResults = lazy(() => import('../components/AnalysisResults.jsx'))

function formatFileSize(size) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function NewAnalysisPage() {
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [jobFileName, setJobFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  function chooseResume(file) {
    if (!file) return
    const hasSupportedExtension = /\.(pdf|docx)$/i.test(file.name)

    if (!hasSupportedExtension) {
      setError('Choose a PDF or DOCX resume.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Your resume must be 5 MB or smaller.')
      return
    }

    setError('')
    setExtracted(null)
    setAnalysis(null)
    setResumeFile(file)
  }

  async function loadJobDescription(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Choose a plain-text .txt job description.')
      return
    }
    if (file.size > MAX_JOB_DESCRIPTION_LENGTH) {
      setError('The job description must be 30,000 characters or fewer.')
      return
    }

    try {
      const text = await file.text()
      if (text.length > MAX_JOB_DESCRIPTION_LENGTH) {
        setError('The job description must be 30,000 characters or fewer.')
        return
      }
      setJobDescription(text)
      setJobFileName(file.name)
      setError('')
      setExtracted(null)
      setAnalysis(null)
    } catch {
      setError('Unable to read that text file.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!resumeFile) {
      setError('Choose a PDF or DOCX resume first.')
      return
    }
    if (!jobDescription.trim()) {
      setError('Paste or upload a job description first.')
      return
    }
    if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      setError('The job description must be 30,000 characters or fewer.')
      return
    }

    const formData = new FormData()
    formData.append('resume', resumeFile)
    formData.append('jobDescription', jobDescription)
    setIsExtracting(true)
    setExtracted(null)
    setAnalysis(null)

    try {
      const response = await fetch(`${API_BASE}/resume/extract`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to read these files. Please try again.')
      }
      setExtracted(payload)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsExtracting(false)
    }
  }

  async function handleAnalyze() {
    if (!extracted || isAnalyzing) return
    setError('')
    setIsAnalyzing(true)

    try {
      const response = await fetch(`${API_BASE}/resume/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: extracted.resumeText,
          jobDescription: extracted.jobDescription,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to analyze this resume. Please try again.')
      }
      setAnalysis(payload.analysis)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resumeWordCount = extracted?.resumeText.trim().split(/\s+/).filter(Boolean).length || 0

  return (
    <main className="dashboard-page section-page new-analysis-page">
      <header className="section-page-heading">
        <span className="page-eyebrow">RESUME WORKSPACE</span>
        <h2>New analysis</h2>
        <p>Add a resume and the role you have in mind.</p>
      </header>

      <form className="analysis-form" onSubmit={handleSubmit}>
        <div className="analysis-input-grid">
          <section className="analysis-card">
            <div className="analysis-card-heading">
              <span className="step-number">01</span>
                <div><h3>Your resume</h3><p>PDF or DOCX, up to 5 MB</p></div>
            </div>
            <label
              className={`resume-dropzone${isDragging ? ' is-dragging' : ''}${resumeFile ? ' has-file' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragLeave={(event) => { event.preventDefault(); setIsDragging(false) }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragging(false)
                chooseResume(event.dataTransfer.files[0])
              }}
            >
              <input
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="dropzone-input"
                onChange={(event) => {
                  chooseResume(event.target.files[0])
                  event.target.value = ''
                }}
                type="file"
              />
              {resumeFile ? (
                <>
                  <span className="dropzone-icon selected"><FileCheck2 size={21} /></span>
                  <span className="dropzone-title">{resumeFile.name}</span>
                  <span className="dropzone-hint">{formatFileSize(resumeFile.size)} · Select another file to replace</span>
                </>
              ) : (
                <>
                  <span className="dropzone-icon"><Upload size={21} /></span>
                  <span className="dropzone-title">Drop your resume here</span>
                  <span className="dropzone-hint">or <strong>browse files</strong></span>
                </>
              )}
            </label>
          </section>

          <section className="analysis-card job-description-card">
            <div className="analysis-card-heading">
              <span className="step-number">02</span>
              <div><h3>Job description</h3><p>Paste the role details or add a .txt file</p></div>
            </div>
            <textarea
              className="job-description-input"
              maxLength={MAX_JOB_DESCRIPTION_LENGTH}
              onChange={(event) => {
                setJobDescription(event.target.value)
                setExtracted(null)
                setAnalysis(null)
              }}
              placeholder="Paste the job description here…"
              value={jobDescription}
            />
            <div className="job-description-footer">
              <label className="text-file-control">
                <input
                  accept=".txt,text/plain"
                  onChange={(event) => {
                    loadJobDescription(event.target.files[0])
                    event.target.value = ''
                  }}
                  type="file"
                />
                <FileText size={14} />
                {jobFileName || 'Upload .txt'}
              </label>
              <span>{jobDescription.length.toLocaleString()} / 30,000</span>
            </div>
          </section>
        </div>

        {error && <p className="analysis-error" role="alert">{error}</p>}

        <div className="analysis-submit-row">
          <span><Check size={15} /> Files are read securely and not saved at this step.</span>
          <button className="primary-action extract-action" disabled={isExtracting} type="submit">
            {isExtracting ? <LoaderCircle className="spinner" size={16} /> : <FileSearch2 size={16} />}
            {isExtracting ? 'Reading files…' : 'Extract resume text'}
          </button>
        </div>
      </form>

      {extracted && (
        <motion.section
          aria-live="polite"
          className="extraction-result"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="extraction-result-heading">
            <span className="result-check"><Check size={17} /></span>
            <div>
              <span className="page-eyebrow">TEXT EXTRACTED</span>
              <h3>{extracted.resumeFile.name}</h3>
            </div>
            <span className="word-count">{resumeWordCount.toLocaleString()} words</span>
            <button
              className="primary-action analyze-action"
              disabled={isAnalyzing}
              onClick={handleAnalyze}
              type="button"
            >
              {isAnalyzing ? <LoaderCircle className="spinner" size={15} /> : analysis ? <RefreshCw size={15} /> : <FileSearch2 size={15} />}
              {isAnalyzing ? 'Analyzing…' : analysis ? 'Analyze again' : 'Analyze & save'}
            </button>
          </div>
          <p className="analysis-consent-note">Your resume and job description will be sent to the configured AI provider and saved with this report.</p>
          <pre className="resume-text-preview">{extracted.resumeText}</pre>
        </motion.section>
      )}

      {isAnalyzing && (
        <section className="analysis-scanning" aria-live="polite">
          <span className="scanning-indicator"><LoaderCircle className="spinner" size={17} /> Comparing resume signals</span>
          <span className="scan-line scan-line-wide" />
          <span className="scan-line scan-line-short" />
          <span className="scan-line scan-line-medium" />
        </section>
      )}

      {analysis && (
        <Suspense fallback={<section className="analysis-scanning">Loading your report…</section>}>
          <AnalysisResults analysis={analysis} />
        </Suspense>
      )}
    </main>
  )
}

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <main className="dashboard-page section-page">
      <header className="section-page-heading">
        <span className="page-eyebrow">YOUR ACCOUNT</span>
        <h2>Profile</h2>
      </header>
      <section className="profile-panel">
        <span className="profile-panel-icon"><UserRound size={21} /></span>
        <div className="profile-fields">
          <div><span>Full name</span><strong>{user?.name}</strong></div>
          <div><span>Email address</span><strong>{user?.email}</strong></div>
        </div>
      </section>
    </main>
  )
}