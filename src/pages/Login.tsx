import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    if (username) {
      navigate('/orders')
    }
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Login successful:', data)
        
        if (data.data) {
          localStorage.setItem('username', data.data.username)
          
          if (data.data.userType) {
            localStorage.setItem('userType', data.data.userType)
          }
          
          if (data.data.allowedScreens) {
            localStorage.setItem('allowedScreens', data.data.allowedScreens)
          }
          
          if (data.data.allowedLocations) {
            localStorage.setItem('allowedLocations', data.data.allowedLocations)
          }
        }
        
        navigate('/orders') 
      } else {
        setError(data.message || 'Login failed. Please check your credentials.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-[480px] p-8 rounded-3xl bg-white border border-gray-200 shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center border border-blue-200">
            <span className="text-2xl text-blue-600">A</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to APS</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 mt-2 py-3 bg-white rounded-xl text-gray-900 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="username"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700">Forgot Password?</a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white rounded-xl text-gray-900 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer py-3 px-4 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login