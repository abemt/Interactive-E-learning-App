import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../../services/apiClient'

function ParentDashboard() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="mt-1 text-gray-600">Track your linked children and add a child anytime using their family code.</p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="btn-primary w-full sm:w-auto"
          >
            + Add Child via Code
          </button>
        </div>

        {childrenLoadError && (
          <div className="alert-danger mb-5">
            {childrenLoadError}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-soft">
          {isLoadingChildren ? (
            <p className="text-gray-600">Loading linked children...</p>
          ) : children.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900">No linked children yet</h2>
              <p className="mt-2 text-gray-600">Use the Add Child via Code button to link your first child.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {children.map((child) => {
                    const isActive = Number(child.studentId) === Number(selectedChildId)

                    return (
                      <button
                        key={child.studentId}
                        type="button"
                        onClick={() => setSelectedChildId(child.studentId)}
                        className={[
                          'rounded-full border px-4 py-2 text-sm font-semibold transition',
                          isActive
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:text-primary-600'
                        ].join(' ')}
                      >
                        {child?.profile?.fullName || `Child ${child.studentId}`}
                      </button>
                    )
                  })}
                </div>

                <div className="w-full sm:w-72">
                  <label htmlFor="child-select" className="mb-1 block text-sm font-medium text-gray-700">
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

              {selectedChild && (
                <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-white to-sky-50 p-5">
                  <h3 className="text-2xl font-semibold text-gray-900">{selectedChild?.profile?.fullName}</h3>
                  <p className="mt-1 text-sm text-gray-600">{selectedChild?.profile?.email || 'No email available'}</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white p-4 shadow-soft">
                      <p className="text-sm text-gray-600">Total XP</p>
                      <p className="text-2xl font-bold text-primary-600">{selectedChild.currentXP || 0}</p>
                    </div>

                    <div className="rounded-lg bg-white p-4 shadow-soft">
                      <p className="text-sm text-gray-600">Highest Level</p>
                      <p className="text-2xl font-bold text-success-600">
                        {selectedChild?.levels?.highestLevel || 1}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white p-4 shadow-soft">
                      <p className="text-sm text-gray-600">Recent Logins</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Array.isArray(selectedChild.recentLoginLogs) ? selectedChild.recentLoginLogs.length : 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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
