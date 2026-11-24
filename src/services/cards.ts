// 語ごとの FSRS カードの永続化。

import { KEYS, loadJson, saveJson } from './storage'
import type { CardMap, StoredCard } from './srs'

export function getCards(): CardMap {
  const raw = loadJson<CardMap>(KEYS.cards, {})
  return raw && typeof raw === 'object' ? raw : {}
}

export function saveCards(cards: CardMap): void {
  saveJson(KEYS.cards, cards)
}

export function putCard(cards: CardMap, id: string, card: StoredCard): CardMap {
  return { ...cards, [id]: card }
}
