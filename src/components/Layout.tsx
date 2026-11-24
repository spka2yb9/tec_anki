import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LearningIcon } from './LearningIcon'

const NAV_ITEMS = [
  { to: '/study', label: 'Anki', icon: 'study' },
  { to: '/words', label: '単語一覧', icon: 'reading' },
  { to: '/stats', label: '統計', icon: 'stats' },
  { to: '/settings', label: '設定', icon: 'settings' },
] as const

/** レスポンシブレイアウト。デスクトップ: 固定サイドバー / モバイル: トップバー + ドロワー */
export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  return (
    <div className="layout">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>
      <header className="topbar">
        <button
          type="button"
          className="menu-btn"
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label={drawerOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={drawerOpen}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link className="topbar-title" to="/study" onClick={() => setDrawerOpen(false)}>
          TecAnki
        </Link>
      </header>

      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <nav className={`sidebar${drawerOpen ? ' open' : ''}`} aria-label="メインナビゲーション">
        <Link className="sidebar-brand" to="/study" onClick={() => setDrawerOpen(false)}>
          <span className="sidebar-logo" aria-hidden="true">
            <LearningIcon kind="study" size={25} />
          </span>
          <span>
            TecAnki
            <br />
            <small>英単語</small>
          </span>
        </Link>
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setDrawerOpen(false)}
              >
                <span aria-hidden="true" className="nav-icon">
                  <LearningIcon kind={item.icon} size={21} />
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
