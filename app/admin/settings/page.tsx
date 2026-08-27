'use client'
import { useEffect, useState } from 'react'
import { Menu, Bell, Mail, KeyRound, ShieldCheck, Radio, CheckCircle2, XCircle } from 'lucide-react'
import { AdminSidebar } from '@/components/praivox'

// Settings page — ab functional hai:
//   1. Change Password — DB-backed (lib/adminCredential.ts), taake
//      admin bina .env.local edit + server restart kiye password
//      badal sake
//   2. Integration Status — n8n se aakhri run kab hui, CRON_SECRET
//      configured hai ya nahi (masked)
//
// Email change abhi shamil nahi hai (scope Section 6, item F: single
// admin account) — agar chahiye ho to bata dena, alag se add ho sakta
// hai.

type Status = {
  adminEmail: string
  cronSecretConfigured: boolean
  cronSecretHint: string | null
  lastRun: { startedAt: string; status: string; itemsFetched: number } | null
}

export default function SettingsPage() {
  const [drawer, setDrawer] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings/status')
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' })
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar drawer={drawer} onClose={() => setDrawer(false)} />
      {drawer && (
        <button
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setDrawer(false)}
          aria-label="Close menu overlay"
        />
      )}
      <div className="lg:pl-64">
        <header className="flex h-[72px] items-center justify-between border-b border-white/[.08] px-5 lg:px-8">
          <button className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <div className="hidden lg:block">
            <p className="text-xs text-muted-foreground">Workspace / Settings</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="size-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
          <p className="mb-2 text-[11px] font-semibold tracking-[.18em] text-cyan-200">ACCOUNT</p>
          <h1 className="font-serif text-4xl text-foreground">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This build supports a single admin account. There are no other users or roles to manage.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-400/10 text-violet-200">
                <Mail className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Admin email</p>
                <p className="mt-1 text-sm text-muted-foreground">{status?.adminEmail ?? '—'}</p>
                <p className="mt-1 text-xs text-muted-foreground">Set via ADMIN_EMAIL in .env.local (not editable here)</p>
              </div>
            </div>

            {/* Change Password — functional form */}
            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-400/10 text-violet-200">
                <KeyRound className="size-4" />
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-foreground">Change password</p>
                <form onSubmit={handleChangePassword} className="mt-3 space-y-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-400/50 focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="New password (min. 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-400/50 focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-400/50 focus:outline-none"
                  />
                  {message && (
                    <p className={`text-xs ${message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                      {message.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Update password'}
                  </button>
                </form>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Login protection</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  5 failed attempts locks the account for 15 minutes to prevent brute-force login attempts.
                </p>
              </div>
            </div>

            {/* Integration status — n8n health */}
            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200">
                <Radio className="size-4" />
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-foreground">n8n integration status</p>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  {status?.cronSecretConfigured ? (
                    <CheckCircle2 className="size-4 text-emerald-300" />
                  ) : (
                    <XCircle className="size-4 text-red-300" />
                  )}
                  <span className="text-muted-foreground">
                    CRON_SECRET {status?.cronSecretConfigured ? `configured (${status.cronSecretHint})` : 'not configured'}
                  </span>
                </div>

                <div className="mt-2 text-sm text-muted-foreground">
                  {status?.lastRun ? (
                    <p>
                      Last run: <span className="text-foreground">{new Date(status.lastRun.startedAt).toLocaleString()}</span>{' '}
                      — {status.lastRun.status} ({status.lastRun.itemsFetched} items received)
                    </p>
                  ) : (
                    <p>No runs yet — trigger the n8n workflow to see activity here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
