import type { FieldType } from '../field-detector/fieldTypes'

export const MANUAL_MAPPINGS_STORAGE_KEY = 'jobAgentManualMappings'

export interface ManualFieldMapping {
  fieldIdentifier: string
  fieldType: FieldType
  label: string
  createdAt: string
}

declare const chrome: {
  storage: {
    local: {
      get(keys: string[]): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
      remove(keys: string[]): Promise<void>
    }
  }
}

function isManualFieldMapping(value: unknown): value is ManualFieldMapping {
  if (!value || typeof value !== 'object') {
    return false
  }

  const mapping = value as Partial<ManualFieldMapping>
  return typeof mapping.fieldIdentifier === 'string'
    && typeof mapping.fieldType === 'string'
    && typeof mapping.label === 'string'
    && typeof mapping.createdAt === 'string'
}

export function normalizeManualMappings(value: unknown): ManualFieldMapping[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isManualFieldMapping)
}

export async function getManualMappings(): Promise<ManualFieldMapping[]> {
  const result = await chrome.storage.local.get([MANUAL_MAPPINGS_STORAGE_KEY])
  return normalizeManualMappings(result[MANUAL_MAPPINGS_STORAGE_KEY])
}

export async function saveManualMapping(mapping: ManualFieldMapping): Promise<ManualFieldMapping> {
  const existing = await getManualMappings()
  const nextMappings = [mapping, ...existing.filter((item) => item.fieldIdentifier !== mapping.fieldIdentifier)]
  await chrome.storage.local.set({ [MANUAL_MAPPINGS_STORAGE_KEY]: nextMappings })
  return mapping
}

export async function deleteManualMapping(fieldIdentifier: string): Promise<void> {
  const existing = await getManualMappings()
  const nextMappings = existing.filter((item) => item.fieldIdentifier !== fieldIdentifier)
  await chrome.storage.local.set({ [MANUAL_MAPPINGS_STORAGE_KEY]: nextMappings })
}
