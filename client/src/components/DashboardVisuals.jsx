import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import {
  Area,
  AreaChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import './DashboardVisuals.css'

function AnimatedScore({ value }) {
  const score = useMotionValue(0)
  const roundedScore = useTransform(score, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(score, value, { duration: 1, ease: 'easeOut' })
    return controls.stop
  }, [score, value])

  return <motion.span>{roundedScore}</motion.span>
}

export default function DashboardVisuals({ score, scores }) {
  const fill = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#fb7185'
  const chartData = scores.map((value, index) => ({ index: index + 1, score: value }))

  return (
    <div className="dashboard-visuals">
      <div className="dashboard-score-gauge" aria-label={`Recent average ATS score ${score} percent`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ name: 'Average match', score, fill }]}
            cx="50%"
            cy="50%"
            innerRadius="78%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="score" background={{ fill: 'rgba(148, 163, 184, 0.16)' }} cornerRadius={99} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="dashboard-score-center" aria-hidden="true">
          <strong><AnimatedScore value={score} />%</strong>
          <span>recent avg.</span>
        </div>
      </div>

      <div className="dashboard-score-trend">
        <span>RECENT SCORE TREND</span>
        <div className="dashboard-sparkline">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 1, left: 1, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.015} />
                </linearGradient>
                <linearGradient id="dashboardTrendStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: 10,
                  background: 'var(--workspace-surface)',
                  color: 'var(--workspace-text)',
                  fontSize: 11,
                }}
                formatter={(value) => [`${value}%`, 'ATS match']}
                labelFormatter={() => ''}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="url(#dashboardTrendStroke)"
                strokeWidth={2.5}
                fill="url(#dashboardTrendFill)"
                isAnimationActive
                animationDuration={900}
                dot={false}
                activeDot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}