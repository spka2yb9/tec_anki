import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./services/speech', () => ({
  NORMAL_RATE: 1,
  SLOW_RATE: 0.5,
  speechService: { isSupported: () => false, speak: vi.fn(), stop: vi.fn() },
}))

import App from './App'

function visit(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('TecAnki の画面', () => {
  it('初期表示でAnkiページを表示する', async () => {
    visit('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Anki' }, { timeout: 5000 })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /答えを表示/ }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('単語一覧を表示する', async () => {
    visit('/words')
    expect(await screen.findByRole('heading', { level: 1, name: '単語一覧' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('Ankiページで最初のカードを表示する', async () => {
    visit('/study')
    expect(await screen.findByRole('button', { name: /答えを表示/ }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('404 を表示する', async () => {
    visit('/nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'ページが見つかりません' }, { timeout: 5000 })).toBeInTheDocument()
  })
})
