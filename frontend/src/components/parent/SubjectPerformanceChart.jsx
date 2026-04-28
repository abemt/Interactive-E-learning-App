import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

const BAR_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#03A9F4', '#1E88E5', '#2E7D32']

function normalizeSubjectName(rawEntry) {
  return (
    rawEntry?.subject
    || rawEntry?.subjectName
    || rawEntry?.moduleTitle
    || rawEntry?.moduleName
    || rawEntry?.module?.title
    || rawEntry?.contentItemTitle
    || 'General'
  )
}

function normalizeScore(rawEntry) {
  const scoreCandidates = [
    rawEntry?.score,
    rawEntry?.percentage,
    rawEntry?.quizScore,
    rawEntry?.value
  ]

  const firstValid = scoreCandidates.find((candidate) => Number.isFinite(Number(candidate)))
  const numericScore = Number(firstValid)

  if (!Number.isFinite(numericScore)) {
    return null
  }

  // Accept 0-1 decimal score payloads and convert to percentage.
  if (numericScore >= 0 && numericScore <= 1) {
    return Math.round(numericScore * 100)
  }

  if (numericScore < 0) {
    return 0
  }

  if (numericScore > 100) {
    return 100
  }

  return numericScore
}

function CustomTooltip({ active, payload }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null
  }

  const row = payload[0]?.payload
  if (!row) {
    return null
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-medium">
      <p className="text-sm font-semibold text-gray-900">{row.subject}</p>
      <p className="text-sm text-gray-700">Average: <span className="font-bold">{row.averageScore}%</span></p>
      <p className="text-xs text-gray-500">Attempts: {row.attemptCount}</p>
    </div>
  )
}

function SubjectPerformanceChart({ selectedChild }) {
  const chartData = useMemo(() => {
    const recentScores = Array.isArray(selectedChild?.recentQuizScores)
      ? selectedChild.recentQuizScores
      : []

    if (recentScores.length === 0) {
      return []
    }

    const aggregateBySubject = recentScores.reduce((acc, entry) => {
      const subject = normalizeSubjectName(entry)
      const score = normalizeScore(entry)

      if (score === null) {
        return acc
      }

      const previous = acc.get(subject) || { total: 0, count: 0 }
      previous.total += score
      previous.count += 1
      acc.set(subject, previous)
      return acc
    }, new Map())

    return [...aggregateBySubject.entries()]
      .map(([subject, stats]) => ({
        subject,
        averageScore: Number((stats.total / stats.count).toFixed(1)),
        attemptCount: stats.count
      }))
      .sort((left, right) => right.averageScore - left.averageScore)
  }, [selectedChild])

  const hasData = chartData.length > 0

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">Subject Performance Trends</h3>
        <p className="text-sm text-gray-600">
          Average quiz score per subject/module for {selectedChild?.profile?.fullName || 'the selected child'}.
        </p>
      </div>

      {hasData ? (
        <div className="mt-5 h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="subject"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#D1D5DB' }}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#D1D5DB' }}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(33, 150, 243, 0.08)' }} />
              <Bar dataKey="averageScore" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`${entry.subject}-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
                <LabelList dataKey="averageScore" position="top" formatter={(value) => `${value}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="font-medium text-gray-800">No quiz trend data available yet.</p>
          <p className="mt-1 text-sm text-gray-600">Once this child completes quizzes, subject averages will appear here.</p>
        </div>
      )}
    </section>
  )
}

export default SubjectPerformanceChart
