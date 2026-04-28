import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../services/apiClient'
import { clearAuthSession } from '../../services/authStorage'
import SubjectPerformanceChart from './SubjectPerformanceChart'
import ParentInsightsPanel from './ParentInsightsPanel'

function LevelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3l2.6 5.27L20.5 9l-4.25 4.14L17.3 19 12 16.1 6.7 19l1.05-5.86L3.5 9l5.9-.73L12 3z" fill="currentColor" />
    </svg>
  )
}

function XpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M4 18L10 12L14 16L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatLastLogin(loginAt) {
  if (!loginAt) {
    return 'No login yet'
  }

  const parsed = new Date(loginAt)
  if (Number.isNaN(parsed.getTime())) {
    return 'No login yet'
  }

  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function ParentDashboard() {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [isLoadingChildren, setIsLoadingChildren] = useState(true)
  const [childrenLoadError, setChildrenLoadError] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [familyLinkCode, setFamilyLinkCode] = useState('')
  const [isSubmittingCode, setIsSubmittingCode] = useState(false)
  const [modalError, setModalError] = useState('')

  const [toastMessage, setToastMessage] = useState('')

  const fetchLinkedChildren = useCallback(async (preferredChildId = null) => {
    try {
      setChildrenLoadError('')
      const response = await apiClient.get('/parent/children')
      const linkedChildren = Array.isArray(response?.data?.data) ? response.data.data : []

      setChildren(linkedChildren)
      setSelectedChildId((currentSelectedId) => {
        if (linkedChildren.length === 0) {
          return null
        }

        if (
          preferredChildId !== null
          && linkedChildren.some((child) => Number(child.studentId) === Number(preferredChildId))
        ) {
          return preferredChildId
        }

        if (
          currentSelectedId !== null
          && linkedChildren.some((child) => Number(child.studentId) === Number(currentSelectedId))
        ) {
          return currentSelectedId
        }

        return linkedChildren[0].studentId
      })
    } catch (error) {
      const fallbackMessage = 'Failed to load your linked children. Please refresh and try again.'
      setChildrenLoadError(error?.response?.data?.message || fallbackMessage)
    } finally {
      setIsLoadingChildren(false)
    }
  }, [])

  useEffect(() => {
    fetchLinkedChildren()
  }, [fetchLinkedChildren])

  useEffect(() => {
    if (!toastMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 3500)

    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  const selectedChild = useMemo(
    () => children.find((child) => Number(child.studentId) === Number(selectedChildId)) || null,
    [children, selectedChildId]
  )

  const selectedChildKpis = useMemo(() => {
    if (!selectedChild) {
      return {
        level: '--',
        xp: '--',
        lastLogin: 'No child selected'
      }
    }

    const latestLogin = Array.isArray(selectedChild.recentLoginLogs)
      ? selectedChild.recentLoginLogs[0]?.loginAt
      : null

    return {
      level: selectedChild?.levels?.highestLevel ?? 1,
      xp: selectedChild?.currentXP ?? 0,
      lastLogin: formatLastLogin(latestLogin)
    }
  }, [selectedChild])

  const openModal = () => {
    setFamilyLinkCode('')
    setModalError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSubmittingCode) {
      return
    }

    setIsModalOpen(false)
    setModalError('')
    setFamilyLinkCode('')
  }

  const handleLinkCodeSubmit = async (event) => {
    event.preventDefault()

    const normalizedCode = familyLinkCode.trim().toUpperCase().replace(/\s+/g, '')

    if (!normalizedCode) {
      setModalError('Please enter your family link code.')
      return
    }

    if (normalizedCode.length !== 6) {
      setModalError('Please enter a valid 6-Digit Family Link Code.')
      return
    }

    setIsSubmittingCode(true)
    setModalError('')

    try {
      const response = await apiClient.post('/parent/link-code', {
        code: normalizedCode
      })

      const linkedStudentId = response?.data?.data?.student?.id || null
      const successMessage = response?.data?.message || 'Child linked successfully.'

      setIsModalOpen(false)
      setFamilyLinkCode('')
      setToastMessage(successMessage)

      await fetchLinkedChildren(linkedStudentId)
    } catch (error) {
      const fallbackMessage = 'Unable to link child with that code. Please check the code and try again.'
      setModalError(error?.response?.data?.message || fallbackMessage)
    } finally {
      setIsSubmittingCode(false)
    }
  }

  const handleLogout = () => {
    clearAuthSession()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-soft sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Family Workspace</p>
                <h1 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">Parent Dashboard</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  A unified view of your linked children, learning momentum, and latest activity.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={openModal}
                  className="btn-primary w-full sm:w-auto"
                >
                  + Add Child via Code
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-outline w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 sm:w-auto"
                >
                  Log Out
                </button>
              </div>
            </div>

            {childrenLoadError && (
              <div className="alert-danger mt-5 mb-1">
                {childrenLoadError}
              </div>
            )}

            {isLoadingChildren ? (
              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <p className="text-gray-600">Loading linked children...</p>
              </div>
            ) : children.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-900">No linked children yet</h2>
                <p className="mt-2 text-gray-600">Use Add Child via Code to link your first child account.</p>
              </div>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Multi-Child Selector</p>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {children.map((child) => {
                        const isActive = Number(child.studentId) === Number(selectedChildId)

                        return (
                          <button
                            key={child.studentId}
                            type="button"
                            onClick={() => setSelectedChildId(child.studentId)}
                            className={[
                              'whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition',
                              isActive
                                ? 'border-primary-500 bg-primary-500 text-white shadow-soft'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
                            ].join(' ')}
                          >
                            {child?.profile?.fullName || `Child ${child.studentId}`}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <label htmlFor="child-select" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Active Child
                    </label>
                    <select
                      id="child-select"
                      className="input"
                      value={selectedChildId || ''}
                      onChange={(event) => setSelectedChildId(Number(event.target.value))}
                    >
                      {children.map((child) => (
                        <option key={child.studentId} value={child.studentId}>
                          {child?.profile?.fullName || `Child ${child.studentId}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-gray-500">Current Level</p>
                        <p className="mt-2 text-3xl font-extrabold text-gray-900">{selectedChildKpis.level}</p>
                        <p className="mt-1 text-sm text-gray-500">{selectedChild?.profile?.fullName || 'No child selected'}</p>
                      </div>
                      <span className="rounded-xl bg-warning-50 p-2 text-warning-700">
                        <LevelIcon />
                      </span>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-gray-500">Total XP</p>
                        <p className="mt-2 text-3xl font-extrabold text-gray-900">{selectedChildKpis.xp}</p>
                        <p className="mt-1 text-sm text-gray-500">Cumulative earned experience</p>
                      </div>
                      <span className="rounded-xl bg-primary-50 p-2 text-primary-700">
                        <XpIcon />
                      </span>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-soft sm:col-span-2 xl:col-span-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-gray-500">Last Login</p>
                        <p className="mt-2 text-xl font-extrabold text-gray-900">{selectedChildKpis.lastLogin}</p>
                        <p className="mt-1 text-sm text-gray-500">Most recent platform activity</p>
                      </div>
                      <span className="rounded-xl bg-success-50 p-2 text-success-700">
                        <LoginIcon />
                      </span>
                    </div>
                  </article>
                </div>

                <SubjectPerformanceChart selectedChild={selectedChild} />
                <ParentInsightsPanel selectedChild={selectedChild} />

                {selectedChild && (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <h3 className="text-xl font-bold text-gray-900">{selectedChild.profile?.fullName}</h3>
                    <p className="mt-1 text-sm text-gray-600">{selectedChild.profile?.email || 'No email available'}</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-large">
            <h2 className="text-2xl font-bold text-gray-900">Link Child Account</h2>
            <p className="mt-1 text-gray-600">Enter the 6-Digit Family Link Code provided for your child.</p>

            <form className="mt-5 space-y-4" onSubmit={handleLinkCodeSubmit}>
              <div>
                <label htmlFor="family-link-code" className="mb-1 block text-sm font-medium text-gray-700">
                  6-Digit Family Link Code
                </label>
                <input
                  id="family-link-code"
                  type="text"
                  inputMode="text"
                  maxLength={6}
                  autoComplete="off"
                  className="input uppercase tracking-widest"
                  placeholder="Enter code"
                  value={familyLinkCode}
                  onChange={(event) => setFamilyLinkCode(event.target.value)}
                />
              </div>

              {modalError && (
                <p className="text-sm font-medium text-danger-700">{modalError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmittingCode}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingCode}
                  className="btn-primary flex-1"
                >
                  {isSubmittingCode ? 'Linking...' : 'Link Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed right-4 top-4 z-[60] max-w-sm rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-success-800 shadow-medium">
          <p className="font-semibold">Success</p>
          <p className="text-sm">{toastMessage}</p>
        </div>
      )}
    </div>
  )
}

export default ParentDashboard
