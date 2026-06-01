import { clsx } from 'clsx'

export function cn(...inputs) {
  return clsx(inputs)
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getComplianceLabel(score) {
  if (score >= 85) return { label: 'Compliant', color: 'green' }
  if (score >= 60) return { label: 'Partial', color: 'yellow' }
  return { label: 'Non-Compliant', color: 'red' }
}

export function calculateScore(responses) {
  const answered = responses.filter(r => r.answer === 'yes' || r.answer === 'no')
  const yes = responses.filter(r => r.answer === 'yes').length
  if (answered.length === 0) return 0
  return Math.round((yes / answered.length) * 100)
}

export function truncate(str, length = 60) {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
