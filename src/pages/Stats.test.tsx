import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Stats } from './Stats'

beforeEach(() => {
  window.localStorage.clear()
})

describe('Stats', () => {
  it('主要なセクションと指標を表示する', () => {
    render(<Stats />)
    expect(screen.getByRole('heading', { level: 1, name: '統計' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '学習の全体像' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '今後14日の復習' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '学習カレンダー' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '評価の内訳' })).toBeInTheDocument()
  })

  it('成熟度ドーナツとチャートに説明を付ける', () => {
    render(<Stats />)
    expect(screen.getByRole('img', { name: /成熟/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /直近12週間の学習カレンダー/ })).toBeInTheDocument()
  })

  it('記録が無くても0で表示する', () => {
    render(<Stats />)
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
  })
})
