import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExampleSentence } from './ExampleSentence'

describe('ExampleSentence', () => {
  it('例文の単語をタップすると意味を表示する', async () => {
    render(<ExampleSentence sentence="She reads a book." />)
    fireEvent.click(screen.getByRole('button', { name: 'reads' }))
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('read')
  })

  it('未収録の語でも壊れない', async () => {
    render(<ExampleSentence sentence="Zzzqx plim." />)
    fireEvent.click(screen.getByRole('button', { name: 'Zzzqx' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('未収録')
  })

  it('熟語は繋げて1つの単語として扱う', async () => {
    render(<ExampleSentence sentence="He decided to give up smoking." />)
    expect(screen.queryByRole('button', { name: 'give' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'give up' }))
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('give up')
    expect(tooltip).toHaveTextContent('あきらめる')
  })

  it('活用した熟語も原型の意味を出す', async () => {
    render(<ExampleSentence sentence="She gave up her job." />)
    fireEvent.click(screen.getByRole('button', { name: 'gave up' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('give up')
  })
})
