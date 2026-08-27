'use client'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft, LockKeyhole } from 'lucide-react'
import { Logo, NetworkVisual, LoadingButton } from '@/components/praivox'

export default function AdminLoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false); const [remember, setRemember] = useState(true); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Enter your email and password to continue.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.href = '/admin'
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Those credentials did not match our records.')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-12"><NetworkVisual small /><div className="relative z-10 w-full max-w-md"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to Praivox</Link><div className="rounded-2xl border border-white/10 bg-[#0c1220]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9"><Logo /><div className="mt-10"><div className="mb-2 flex items-center gap-2"><LockKeyhole className="size-4 text-cyan-200" /><p className="text-[11px] font-semibold tracking-[.18em] text-cyan-200">ADMIN PORTAL</p></div><h1 className="font-serif text-3xl text-foreground">Welcome back.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to manage and review published intelligence.</p></div><form onSubmit={submit} className="mt-8 space-y-5" noValidate><label className="block"><span className="mb-2 block text-xs font-medium text-foreground">Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@praivox.com" className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/15" /></label><label className="block"><span className="mb-2 block text-xs font-medium text-foreground">Password</span><span className="relative block"><input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 pr-11 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/15" /><button type="button" onClick={() => setShow(!show)} className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-muted-foreground hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>{error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-400/[.06] px-3 py-2 text-xs text-red-200">{error}</p>}<div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="size-3.5 accent-violet-500" /> Remember me</label><button type="button" className="text-xs text-violet-300 transition hover:text-violet-200">Forgot password?</button></div><button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-500 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"><LoadingButton loading={loading} /></button></form></div></div></main>
}
