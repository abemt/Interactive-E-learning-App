import { useMemo } from 'react'

function BadgePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M12 3l2.1 4.28 4.72.69-3.41 3.33.8 4.7L12 13.76 7.78 16l.8-4.7L5.17 7.97l4.72-.69L12 3z" fill="currentColor" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    </svg>
  )
}

function TimelineDotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  )
}

function isSameDate(left, right) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  )
}

function formatTimelineTimestamp(timestamp) {
  if (!timestamp) {
    return 'Unknown activity time'
  }

  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown activity time'
  }

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const timePart = parsed.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })

  if (isSameDate(parsed, now)) {
    return `Today at ${timePart}`
  }

  if (isSameDate(parsed, yesterday)) {
    return `Yesterday at ${timePart}`
  }

  const datePart = parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return `${datePart} at ${timePart}`
}

function ParentInsightsPanel({ selectedChild }) {
  const childBadges = useMemo(
    () => (Array.isArray(selectedChild?.badges) ? selectedChild.badges : []),
    [selectedChild]
  )

  const loginTimeline = useMemo(
    () => (Array.isArray(selectedChild?.recentLoginLogs) ? selectedChild.recentLoginLogs.slice(0, 7) : []),
    [selectedChild]
  )

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Achievements</h3>
            <p className="text-sm text-gray-600">Badge showcase for {selectedChild?.profile?.fullName || 'selected child'}</p>
          </div>
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            {childBadges.length} earned
          </span>
        </div>

        {childBadges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
            <p className="font-medium text-gray-800">No badges unlocked yet.</p>
            <p className="mt-1 text-sm text-gray-600">Completed lessons and strong quiz performance will unlock achievements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {childBadges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center transition hover:border-primary-300 hover:shadow-soft"
                title={badge.description || badge.title || 'Badge'}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white text-primary-700 shadow-sm ring-1 ring-gray-200">
                  {badge.iconUrl ? (
                    <img
                      src={badge.iconUrl}
                      alt={badge.title || 'Badge icon'}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <BadgePlaceholderIcon />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900">{badge.title || 'Achievement Badge'}</p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {badge.badgeType || 'Special'}
                </p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">Attendance Timeline</h3>
          <p className="text-sm text-gray-600">Recent sign-ins and activity flow</p>
        </div>

        {loginTimeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
            <p className="font-medium text-gray-800">No attendance logs yet.</p>
            <p className="mt-1 text-sm text-gray-600">Login events will appear here once activity is recorded.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {loginTimeline.map((entry, index) => (
              <li key={entry.id || `${entry.loginAt}-${index}`} className="relative pl-8">
                {index < loginTimeline.length - 1 && (
                  <span className="absolute left-[11px] top-5 h-[calc(100%+0.5rem)] w-px bg-gray-200" aria-hidden="true" />
                )}
                <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-success-50 text-success-700 ring-2 ring-white">
                  <TimelineDotIcon />
                </span>

                <p className="text-sm font-semibold text-gray-900">{formatTimelineTimestamp(entry.loginAt)}</p>
                <p className="mt-0.5 text-xs text-gray-600">Successful platform login recorded.</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

export default ParentInsightsPanel
