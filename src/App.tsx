import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import './tecanki.css'
import { Layout } from './components/Layout'

const Study = lazy(() => import('./pages/Study').then((module) => ({ default: module.Study })))
const Words = lazy(() => import('./pages/Words').then((module) => ({ default: module.Words })))
const Stats = lazy(() => import('./pages/Stats').then((module) => ({ default: module.Stats })))
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))

function PageLoader() {
  return (
    <div className="page page-loading" role="status">
      <span className="loading-dot" aria-hidden="true" />
      単語データを読み込んでいます…
    </div>
  )
}

function NotFound() {
  return (
    <div className="page empty-state">
      <p className="eyebrow">404</p>
      <h1>ページが見つかりません</h1>
      <p>URLを確認するか、Ankiページに戻って学習を続けてください。</p>
      <Link className="btn-primary" to="/study">
        Ankiへ戻る
      </Link>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/study" replace />} />
            <Route path="study" element={<Study />} />
            <Route path="words" element={<Words />} />
            <Route path="stats" element={<Stats />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
