import { createSignals, type FieldSignal } from './signals'
import type { FieldType } from './fieldTypes'
import type { FieldDetection, FormFieldMetadata } from './types'

export function normalizeFieldText(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function collectMatchText(metadata: FormFieldMetadata): string {
  return [
    metadata.name,
    metadata.id,
    metadata.placeholder,
    metadata.ariaLabel,
    metadata.autocomplete,
    metadata.labelText,
    metadata.nearbyText,
  ].map(normalizeFieldText).filter(Boolean).join(' ')
}

function chooseDetection(signals: FieldSignal[]): { fieldType: FieldType; confidence: number } {
  if (signals.length === 0) return { fieldType: 'unknown', confidence: 0 }

  const scores = new Map<Exclude<FieldType, 'unknown'>, number>()
  for (const signal of signals) {
    scores.set(signal.fieldType, Math.min(1, (scores.get(signal.fieldType) ?? 0) + signal.weight))
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const [bestType, bestScore] = ranked[0]
  const secondScore = ranked[1]?.[1] ?? 0
  const confidence = Math.min(0.99, Math.max(0, bestScore / (bestScore + secondScore * 0.35)))

  if (bestScore < 0.55 || (bestScore - secondScore < 0.18 && confidence < 0.75)) {
    return { fieldType: 'unknown', confidence: Number(confidence.toFixed(2)) }
  }

  return { fieldType: bestType, confidence: Number(confidence.toFixed(2)) }
}

export function detectField(metadata: FormFieldMetadata): FieldDetection {
  const signals = createSignals(metadata, collectMatchText(metadata))
  const detection = chooseDetection(signals)
  return { ...detection, metadata }
}

export function detectFields(metadata: FormFieldMetadata[]): FieldDetection[] {
  return metadata.map(detectField)
}
