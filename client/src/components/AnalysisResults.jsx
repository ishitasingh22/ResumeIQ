import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { AlignLeft, BriefcaseBusiness, Check, ChevronDown, FileText, Plus, Sparkles, Wrench } from 'lucide-react'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import './AnalysisResults.css'

const sectionIcons = {
  Summary: Sparkles,
  Skills: Wrench,
  Experience: BriefcaseBusiness,
  Formatting: AlignLeft,
}

function AnimatedScore({ value }) {
  const score = useMotionValue(0)
  const roundedScore = useTransform(score, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(score, value, { duration: 1.1, ease: 'easeOut' })
    return controls.stop
  }, [score, value])

  return <motion.strong>{roundedScore}</motion.strong>
}

function getWordDiff(original, rewritten) {
  const originalParts = original.split(/(\s+)/)
  const rewrittenParts = rewritten.split(/(\s+)/)
  let prefix = 0
  let suffix = 0

  while (
    prefix < originalParts.length &&
    prefix < rewrittenParts.length &&
    originalParts[prefix] === rewrittenParts[prefix]
  ) prefix += 1

  while (
    suffix < originalParts.length - prefix &&
    suffix < rewrittenParts.length - prefix &&
    originalParts[originalParts.length - suffix - 1] === rewrittenParts[rewrittenParts.length - suffix - 1]
  ) suffix += 1

  return {
    before: {
      prefix: originalParts.slice(0, prefix).join(''),
      changed: originalParts.slice(prefix, originalParts.length - suffix).join(''),
      suffix: suffix ? originalParts.slice(-suffix).join('') : '',
    },
    after: {
      prefix: rewrittenParts.slice(0, prefix).join(''),
      changed: rewrittenParts.slice(prefix, rewrittenParts.length - suffix).join(''),
      suffix: suffix ? rewrittenParts.slice(-suffix).join('') : '',
    },
  }
}

function RewriteText({ version, parts }) {
  return (
    <p className="rewrite-text">
      {parts.prefix}
      {parts.changed && (version === 'before'
        ? <del>{parts.changed}</del>
        : <ins>{parts.changed}</ins>)}
      {parts.suffix}
    </p>
  )
}

function BulletRewrite({ rewrite }) {
  const [view, setView] = useState('compare')
  const diff = getWordDiff(rewrite.original, rewrite.rewritten)

  return (
    <section className="bullet-rewrite-panel">
      <header className="bullet-rewrite-heading">
        <div>
          <span className="page-eyebrow">A CLEARER WAY TO SAY IT</span>
          <h4><Sparkles size={16} /> Bullet rewrite</h4>
        </div>
        <div className="rewrite-view-switch" aria-label="Rewrite comparison view" role="group">
          {[
            ['compare', 'Compare'],
            ['before', 'Before'],
            ['after', 'After'],
          ].map(([value, label]) => (
            <button
              aria-pressed={view === value}
              className={view === value ? 'active' : ''}
              key={value}
              onClick={() => setView(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className={`rewrite-columns rewrite-view-${view}`}>
        {view !== 'after' && (
          <section className="rewrite-column rewrite-before">
            <span>BEFORE</span>
            <RewriteText parts={diff.before} version="before" />
          </section>
        )}
        {view !== 'before' && (
          <section className="rewrite-column rewrite-after">
            <span>AFTER</span>
            <RewriteText parts={diff.after} version="after" />
          </section>
        )}
      </div>
      <p className="rewrite-rationale">{rewrite.rationale}</p>
    </section>
  )
}

export default function AnalysisResults({ analysis }) {
  const scoreColor = analysis.atsScore >= 80 ? '#34d399' : analysis.atsScore >= 60 ? '#fbbf24' : '#fb7185'

  return (
    <motion.section
      aria-labelledby="analysis-results-title"
      className="analysis-results"
      initial={{ opacity: 0, y: 9 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <header className="analysis-results-heading">
        <div>
          <span className="page-eyebrow">YOUR MATCH REPORT</span>
          <h3 id="analysis-results-title">Resume analysis</h3>
        </div>
        <span className="saved-indicator"><Check size={14} /> Saved to history</span>
      </header>

      <div className="results-overview">
        <section
          className="score-card"
          style={{ '--score-color': scoreColor }}
          aria-label={`ATS match score: ${analysis.atsScore} percent`}
        >
          <div className="score-chart">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={[{ name: 'Match', score: analysis.atsScore, fill: scoreColor }]}
                cx="50%"
                cy="50%"
                innerRadius="78%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="score" background={{ fill: 'rgba(148, 163, 184, 0.16)' }} cornerRadius={99} isAnimationActive animationDuration={1100} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="score-center" aria-hidden="true">
              <AnimatedScore value={analysis.atsScore} />
              <span>ATS match</span>
            </div>
          </div>
          <div className="score-caption">
            <span>Resume-to-role fit</span>
            <strong>{analysis.atsScore >= 80 ? 'Strong alignment' : analysis.atsScore >= 60 ? 'Promising fit' : 'Room to strengthen'}</strong>
          </div>
        </section>

        <section className="keyword-card">
          <div className="result-section-heading">
            <div><span className="page-eyebrow">KEYWORD GAPS</span><h4>Worth highlighting</h4></div>
            <span className="keyword-count">{analysis.missingKeywords.length}</span>
          </div>
          {analysis.missingKeywords.length > 0 ? (
            <div className="keyword-list">
              {analysis.missingKeywords.map((keyword) => (
                <span className="keyword-chip" key={keyword}><Plus size={12} aria-hidden="true" />{keyword}</span>
              ))}
            </div>
          ) : (
            <p className="no-keywords">No major keyword gaps found.</p>
          )}
        </section>
      </div>

      {analysis.bulletRewrite && <BulletRewrite rewrite={analysis.bulletRewrite} />}

      <section className="suggestions-section">
        <div className="result-section-heading">
          <div><span className="page-eyebrow">NEXT EDITS</span><h4>Suggestions by section</h4></div>
          <span className="suggestion-count">{analysis.suggestions.length} sections</span>
        </div>
        <div className="suggestion-list">
          {analysis.suggestions.map(({ section, suggestion, rationale }, index) => {
            const SectionIcon = sectionIcons[section] || FileText
            return (
            <details className="suggestion-item" key={section}>
              <summary>
                <span className="suggestion-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="suggestion-icon"><SectionIcon size={15} /></span>
                <strong>{section}</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <div className="suggestion-copy">
                <p>{suggestion}</p>
                <span>{rationale}</span>
              </div>
            </details>
            )
          })}
        </div>
      </section>
    </motion.section>
  )
}