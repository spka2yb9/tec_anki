import { describe, expect, it } from 'vitest'
import { lookupPhrase, lookupWord } from './wordLookup'

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

describe('lookupPhrase', () => {
  it('句動詞をそのままの形で引ける', () => {
    expect(lookupPhrase(['give', 'up'])?.entry.word).toBe('give up')
  })

  it('先頭の語の活用形を原型に戻して引ける', () => {
    expect(lookupPhrase(['gave', 'up'])?.entry.word).toBe('give up')
    expect(lookupPhrase(['looking', 'after', 'the'])?.entry.word).toBe('look after')
  })

  it('最長一致を優先し、一致した語数を返す', () => {
    const match = lookupPhrase(['get', 'rid', 'of', 'these'])
    expect(match?.entry.word).toBe('get rid of')
    expect(match?.length).toBe(3)
  })

  it('汎用コロケーション(表現)は熟語として扱わない', () => {
    expect(lookupPhrase(['reads', 'a', 'book'])).toBeUndefined()
    expect(lookupPhrase(['reads'])).toBeUndefined()
  })
})
