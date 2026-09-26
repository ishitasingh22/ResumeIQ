import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BriefcaseBusiness,
  FilePlus2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  SearchCheck,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import '../Dashboard.css'

const primaryItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/new-analysis', label: 'New Analysis', icon: FilePlus2 },
  { to: '/dashboard/history', label: 'History', icon: History },
]

const careerItems = [
  { to: '/dashboard/interview-prep', label: 'Interview Prep', icon: SearchCheck },
  { to: '/dashboard/job-suggestions', label: 'Job Suggestions', icon: BriefcaseBusiness },
  { to: '/dashboard/profile', label: 'Profile', icon: UserRound },
]

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function Sidebar({ isOpen, isCollapsed, onNavigate, onToggleCollapse, user }) {
  return (
    <aside className={`dashboard-sidebar${isOpen ? ' is-open' : ''}`}>
      <div className="sidebar-brand-row">
        <Link className="dashboard-brand" to="/dashboard" onClick={onNavigate}>
          <span className="brand-symbol"><span /></span>
          <span>resume<span className="brand-iq">iq</span></span>
        </Link>
        <button
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="sidebar-collapse-button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {primaryItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            end={end}
            key={to}
            onClick={onNavigate}
            to={to}
            title={isCollapsed ? label : undefined}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="sidebar-section-label sidebar-section-spaced">CAREER TOOLS</div>
        {careerItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            key={to}
            onClick={onNavigate}
            to={to}
            title={isCollapsed ? label : undefined}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-account">
        <span className="account-avatar">{getInitials(user?.name)}</span>
        <span className="account-copy">
          <strong>{user?.name}</strong>
          <span>Personal workspace</span>
        </span>
        <span className="account-status" aria-label="Account active" />
      </div>
    </aside>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() =>
    window.localStorage.getItem('resumeiq-theme') === 'dark' ? 'dark' : 'light',
  )
  const [isCollapsed, setIsCollapsed] = useState(() =>
    window.localStorage.getItem('resumeiq-sidebar-collapsed') === 'true',
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const activeItem = [...primaryItems, ...careerItems].find(
    (item) => item.to === location.pathname || (!item.end && location.pathname.startsWith(`${item.to}/`)),
  )
  const pageTitle = location.pathname.startsWith('/dashboard/history/')
    ? 'Analysis detail'
    : activeItem?.label || 'Dashboard'

  useEffect(() => {
    window.localStorage.setItem('resumeiq-theme', theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem('resumeiq-sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  async function handleSignOut() {
    await logout().catch(() => {})
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={`dashboard-shell${isCollapsed ? ' is-collapsed' : ''}`}
      data-theme={theme}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isSidebarOpen) setIsSidebarOpen(false)
      }}
    >
      <Sidebar
        isCollapsed={isCollapsed}
        isOpen={isSidebarOpen}
        onNavigate={() => setIsSidebarOpen(false)}
        onToggleCollapse={() => setIsCollapsed((collapsed) => !collapsed)}
        user={user}
      />
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.button
            aria-label="Close navigation"
            className="sidebar-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          />
        )}
      </AnimatePresence>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-title-group">
            <button
              aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
              className="mobile-menu-button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              type="button"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <span className="topbar-overline">RESUMEIQ WORKSPACE</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="theme-toggle"
              onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              type="button"
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -65, scale: 0.65 }}
                  initial={{ opacity: 0, rotate: 65, scale: 0.65 }}
                  key={theme}
                  transition={{ duration: 0.18 }}
                >
                  {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
                </motion.span>
              </AnimatePresence>
              <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
            <span className="topbar-divider" />
            <span className="topbar-user" title={user?.email}>
              <span className="topbar-avatar">{getInitials(user?.name)}</span>
              <span>{user?.name?.split(' ')[0]}</span>
            </span>
            <button
              aria-label="Sign out"
              className="topbar-signout"
              onClick={handleSignOut}
              title="Sign out"
              type="button"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="dashboard-content"
          initial={{ opacity: 0, y: 7 }}
          key={location.pathname}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
        <footer className="dashboard-footer">
          <span>ResumeIQ</span>
          <span>Built for your next move</span>
        </footer>
      </div>
    </div>
  )
}