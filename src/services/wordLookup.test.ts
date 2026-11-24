import { describe, expect, it } from 'vitest'
import { lookupWord } from './wordLookup'

describe('lookupWord', () => {
  it('見出し語をそのまま引ける', () => {
    expect(lookupWord('abandon')?.id).toBe('abandon')
  })

  it('大文字・前後の記号を無視する', () => {
    expect(lookupWord('Abandon.')?.id).toBe('abandon')
    expect(lookupWord('"abandon,')?.id).toBe('abandon')
  })

  it('複数形・所有格を原型に戻す', () => {
    expect(lookupWord("companies")?.id).toBe('company')
    expect(lookupWord("company's")?.id).toBe('company')
  })

  it('-ing / -ed を原型に戻す', () => {
    expect(lookupWord('absorbing')?.id).toBe('absorb')
    expect(lookupWord('stopped')?.id).toBe('stop')
  })

  it('不規則変化を原型に戻す', () => {
    expect(lookupWord('took')?.id).toBe('take')
    expect(lookupWord('children')?.id).toBe('child')
  })

  it('辞書にない語は undefined', () => {
    expect(lookupWord('zzzznotaword')).toBeUndefined()
    expect(lookupWord('123')).toBeUndefined()
  })
})
