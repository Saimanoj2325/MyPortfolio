/**
 * Feedback & River Message submission service.
 * Dispatches messages to your Google Apps Script Web App (Google Sheet)
 * and keeps a local backup in localStorage.
 */

export type FeedbackPayload = {
  name?: string
  email?: string
  message: string
  source?: 'River Bottle' | 'Contact Form' | string
}

export async function submitToGoogleSheet(payload: FeedbackPayload): Promise<boolean> {
  const url = import.meta.env.VITE_FEEDBACK_SHEET_URL || ''

  // Always save a local copy as a fail-safe
  try {
    const key = 'who_am_i_feedback_submissions'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push({
      ...payload,
      timestamp: new Date().toISOString(),
    })
    localStorage.setItem(key, JSON.stringify(existing))
  } catch (e) {
    console.warn('Could not save local feedback backup:', e)
  }

  if (!url) {
    console.info('No VITE_FEEDBACK_SHEET_URL provided. Saved to local storage.')
    return true
  }

  try {
    // Mode 'no-cors' with 'text/plain' ensures Google Apps Script receives the full JSON
    // without getting blocked by browser CORS preflight
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    })
    return true
  } catch (err) {
    console.error('Failed to dispatch feedback to Google Sheet:', err)
    return false
  }
}

