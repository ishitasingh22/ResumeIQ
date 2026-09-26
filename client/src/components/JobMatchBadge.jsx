import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'

export default function JobMatchBadge({ score }) {
  const fill = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#fb7185'

  return (
    <div className="job-match" role="img" aria-label={`${score}% role keyword match`}>
      <div className="job-match-ring">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ score, fill }]}
            cx="50%"
            cy="50%"
            innerRadius="78%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="score" background={{ fill: 'rgba(148, 163, 184, 0.14)' }} cornerRadius={99} isAnimationActive animationDuration={900} />
          </RadialBarChart>
        </ResponsiveContainer>
        <span className="job-match-center">{score}<small>%</small></span>
      </div>
      <span className="job-match-label">match</span>
    </div>
  )
}