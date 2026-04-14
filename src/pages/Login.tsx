import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const username = localStorage.getItem('username')
    if (username) navigate('/orders')
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })
      const data = await response.json()
      if (response.ok) {
        if (data.data) {
          localStorage.setItem('username', data.data.username)
          if (data.data.userType) localStorage.setItem('userType', data.data.userType)
          if (data.data.allowedScreens) localStorage.setItem('allowedScreens', data.data.allowedScreens)
          if (data.data.allowedLocations) localStorage.setItem('allowedLocations', data.data.allowedLocations)
        }
        navigate('/orders')
      } else {
        setError(data.message || 'Login failed. Please check your credentials.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-7 w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Admin Portal
          </span>
          <span className="h-px w-8 bg-zinc-300 block" />
          <span className="text-[10px] font-mono text-zinc-400">APS System</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Sign in</h1>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm bg-white border border-zinc-200 rounded-xl shadow-sm p-8"
      >
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-100"
            >
              <p className="text-xs font-mono text-rose-500">{error}</p>
            </motion.div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 font-mono">
              Username
            </span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username"
              required
              disabled={loading}
              className="w-full appearance-none bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 font-mono placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all hover:border-zinc-400 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 font-mono">
                Password
              </span>
              <a href="#" className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 transition-colors">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full appearance-none bg-white border border-zinc-200 rounded-lg px-3 py-2 pr-9 text-sm text-zinc-800 font-mono placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all hover:border-zinc-400 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                {showPassword
                  ? <EyeSlashIcon className="w-4 h-4" />
                  : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-mono rounded-lg px-4 py-2 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex gap-5 mt-4"
      >
        {[
          { dot: 'bg-emerald-500', label: 'Secure connection' },
          { dot: 'bg-zinc-300', label: 'APS v2.0' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
            <span className={`w-1.5 h-1.5 rounded-full ${dot} inline-block`} />
            {label}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default Login