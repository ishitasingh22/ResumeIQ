import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

function Brand({ light = false }) {
  return (
    <Link className={`wordmark${light ? ' wordmark-light' : ''}`} to="/login">
      <span className="wordmark-mark"><Sparkles size={16} /></span>
      resume<span>iq</span>
    </Link>
  )
}

function StoryPanel() {
  return (
    <motion.aside
      className="auth-story"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <div className="story-topline">
        <Brand light />
        <span>Career signal, not noise</span>
      </div>
      <div className="signal-stage" aria-label="Illustration of a resume match score">
        <div className="signal-orbit" aria-hidden="true" />
        <div className="signal-score">
          <span>Profile fit</span>
          <strong>84<small>%</small></strong>
          <span>and rising</span>
        </div>
        <div className="signal-note signal-note-top"><Check size={15} /> Skills aligned</div>
        <div className="signal-note signal-note-bottom"><Sparkles size={15} /> Clear next steps</div>
      </div>
      <div className="story-copy">
        <span>A sharper way forward</span>
        <h2>Make your next move <em>with signal.</em></h2>
        <p>Bring your experience into focus. Find the strengths, gaps, and opportunities that move your career forward.</p>
      </div>
      <div className="story-bottomline">
        <span>Thoughtful tools for your working life</span>
        <span>01 / 03</span>
      </div>
    </motion.aside>
  )
}

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, isLoading, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const destination = location.state?.from?.pathname || '/dashboard'

  if (isLoading) {
    return <main className="auth-loading" aria-label="Checking your session"><span className="loading-mark"><Sparkles size={24} /></span></main>
  }

  if (user) {
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (isRegister && !name.trim()) {
      setError('Enter your name to create an account.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }

    if (isRegister && password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isRegister) {
        await register({ name, email, password })
      } else {
        await login({ email, password })
      }
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page min-h-screen">
      <section className="auth-form-panel">
        <header className="auth-topbar">
          <Brand />
          <span>YOUR CAREER, IN CLEARER FOCUS</span>
        </header>

        <motion.div
          className="auth-content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          <span className="auth-kicker">{isRegister ? 'START WITH A CLEARER VIEW' : 'WELCOME BACK'}</span>
          <h1>{isRegister ? 'Make room for what’s next.' : 'Good to have you back.'}</h1>
          <p className="auth-subtitle">
            {isRegister
              ? 'Create your account and put your experience to work.'
              : 'Sign in to pick up where your next move begins.'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <label className="auth-field">
                <span>Full name</span>
                <div className="input-wrap">
                  <UserRound size={17} aria-hidden="true" />
                  <input
                    autoComplete="name"
                    maxLength={80}
                    name="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Jordan Lee"
                    required
                    value={name}
                  />
                </div>
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <div className="input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input
                  autoComplete="email"
                  maxLength={254}
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  maxLength={72}
                  minLength={8}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {isRegister && (
              <label className="auth-field">
                <span>Confirm password</span>
                <div className="input-wrap">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    autoComplete="new-password"
                    maxLength={72}
                    minLength={8}
                    name="confirmPassword"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter your password again"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                  />
                </div>
              </label>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
              {!isSubmitting && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to ResumeIQ?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </motion.div>

        <footer className="auth-footer">Your information stays yours.</footer>
      </section>

      <StoryPanel />
    </main>
  )
}