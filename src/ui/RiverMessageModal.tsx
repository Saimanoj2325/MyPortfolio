import { useEffect, useState } from 'react'
import { safeStorage, useStore } from '../store'
import { playSfx } from './sound'
import { camState } from '../lib/actors'
import { submitToGoogleSheet } from '../lib/feedback'

export function RiverMessageModal() {
  const open = useStore((s) => s.riverMessageOpen)
  const setRiverMessageOpen = useStore((s) => s.setRiverMessageOpen)
  const setRiverBottleState = useStore((s) => s.setRiverBottleState)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [animOut, setAnimOut] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setMessage('')
      setError('')
      setSubmitted(false)
      setAnimOut(false)
      playSfx('paper')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseWithoutSubmitting()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitted])

  if (!open) return null

  const handleCloseWithoutSubmitting = () => {
    if (submitted) return
    playSfx('paper')
    setAnimOut(true)
    setTimeout(() => {
      setRiverMessageOpen(false)
      setRiverBottleState('released')
      camState.cine = null
    }, 550)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('Please ink a few words before sealing the parchment.')
      return
    }
    setError('')

    submitToGoogleSheet({
      name: name.trim() || 'Anonymous Traveler',
      email: email.trim() || '',
      message: message.trim(),
      source: 'River Bottle',
    })

    playSfx('seal')
    playSfx('success')
    setSubmitted(true)

    setTimeout(() => {
      playSfx('paper')
    }, 1400)

    setTimeout(() => {
      playSfx('splash')
      setAnimOut(true)
      setTimeout(() => {
        setRiverMessageOpen(false)
        setRiverBottleState('released')
        camState.cine = null
      }, 550)
    }, 3000)
  }

  return (
    <div
      className={`river-modal-scrim ${animOut ? 'is-closing' : 'is-entering'}`}
      role="dialog"
      aria-label="A message in the water"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitted) handleCloseWithoutSubmitting()
      }}
    >
      {/* Physical Unrolled Paper Scroll Container */}
      <div className="paper-scroll-wrapper">
        {/* Curled Top Roll of the unrolled parchment */}
        <div className="paper-scroll-curl top">
          <div className="curl-paper-layer">
            <span className="twine-string-left" />
            <span className="twine-string-right" />
          </div>
        </div>

        {/* The Physical Paper Sheet */}
        <div className="paper-parchment-sheet">
          {/* Deckled Edge Overlays */}
          <div className="paper-deckle-edge top-edge" />
          <div className="paper-deckle-edge bottom-edge" />

          {/* Authentic River Waterways Postmark Stamp */}
          <div className="paper-postmark" aria-hidden="true">
            <div className="postmark-circle">
              <span className="pm-top">RIVER WATERWAYS</span>
              <span className="pm-year">~ 1884 ~</span>
              <span className="pm-sub">POST BY CURRENT</span>
            </div>
            <div className="postmark-lines">
              <span /><span /><span />
            </div>
          </div>

          {/* Real Wax Seal Emblem */}
          <div className="paper-wax-seal" aria-hidden="true">
            <span className="seal-relief">S</span>
          </div>

          {/* Dismiss button */}
          {!submitted && (
            <button
              className="paper-feather-close"
              onClick={handleCloseWithoutSubmitting}
              title="Close without inking"
              aria-label="Close"
            >
              ×
            </button>
          )}

          {!submitted ? (
            <div className="paper-content-flow">
              <header className="paper-letterhead">
                <p className="paper-salutation">A Message in the Water</p>
                <p className="paper-subheading">
                  Found drifting upon the river current. Pen your words upon this parchment — they shall be rolled, corked within the bottle, and set adrift downstream.
                </p>
                <div className="paper-faint-divider" />
              </header>

              <form className="paper-letter-form" onSubmit={handleSubmit}>
                <div className="paper-meta-row">
                  <div className="paper-meta-field">
                    <label htmlFor="paper-author">From the hand of:</label>
                    <input
                      id="paper-author"
                      type="text"
                      className="paper-line-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Traveler, wanderer, friend... (optional)"
                      maxLength={60}
                      autoComplete="name"
                    />
                  </div>
                  <div className="paper-meta-field">
                    <label htmlFor="paper-email">Return address / email:</label>
                    <input
                      id="paper-email"
                      type="email"
                      className="paper-line-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Where words may return... (optional)"
                      maxLength={80}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="paper-message-field">
                  <label htmlFor="paper-msg">Words to be carried by the current:</label>
                  <textarea
                    id="paper-msg"
                    className="paper-ruled-textarea"
                    rows={5}
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); if (error) setError('') }}
                    placeholder="Inscribe your thoughts, feedback, reflections, or a quiet greeting..."
                    maxLength={1400}
                    autoFocus
                  />
                </div>

                {error && <p className="paper-ink-error">{error}</p>}

                <footer className="paper-letter-actions">
                  <button
                    type="button"
                    className="btn-paper-ghost"
                    onClick={handleCloseWithoutSubmitting}
                  >
                    Close without inking
                  </button>
                  <button type="submit" className="btn-paper-seal-submit">
                    <span className="seal-dot" />
                    <span>Roll & Cast into the River</span>
                    <span className="seal-arrow">→</span>
                  </button>
                </footer>
              </form>
            </div>
          ) : (
            <div className="paper-success-stamp-view">
              <div className="paper-wax-stamp-large">
                <span className="wax-emblem">❦</span>
              </div>
              <h3 className="paper-received-heading">“Your message has found its way to me.”</h3>
              <p className="paper-narrative">
                The engineer gently rolls the parchment, slides it back inside the glass bottle, presses the wooden cork firmly in place, and returns the bottle to the water.
              </p>
              <p className="paper-drifting-note">
                It bobs into the open river, drifting peacefully with the current…
              </p>
              <div className="paper-water-waves-glyph">
                <svg width="180" height="24" viewBox="0 0 180 24" fill="none">
                  <path d="M0 12 C 30 2, 60 22, 90 12 C 120 2, 150 22, 180 12" stroke="#8d683b" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Curled Bottom Roll of the unrolled parchment */}
        <div className="paper-scroll-curl bottom">
          <div className="curl-paper-layer" />
        </div>
      </div>
    </div>
  )
}
