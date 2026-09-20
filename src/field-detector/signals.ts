import type { FieldType } from './fieldTypes'
import type { FormFieldMetadata } from './types'

export interface FieldSignal {
  fieldType: Exclude<FieldType, 'unknown'>
  weight: number
  source: string
}

const textSignals: Array<{ fieldType: Exclude<FieldType, 'unknown'>; terms: string[]; weight: number; source: string }> = [
  { fieldType: 'email', terms: ['email', 'e mail', 'e-mail'], weight: 0.58, source: 'text' },
  { fieldType: 'phone', terms: ['phone', 'mobile', 'telephone', 'cell number'], weight: 0.58, source: 'text' },
  { fieldType: 'firstName', terms: ['first name', 'given name', 'forename'], weight: 0.62, source: 'text' },
  { fieldType: 'lastName', terms: ['last name', 'family name', 'surname'], weight: 0.62, source: 'text' },
  { fieldType: 'fullName', terms: ['full name', 'name'], weight: 0.3, source: 'text' },
  { fieldType: 'dateOfBirth', terms: ['date of birth', 'birth date', 'birthday', 'dob'], weight: 0.7, source: 'text' },
  { fieldType: 'address', terms: ['address', 'street address', 'address line'], weight: 0.62, source: 'text' },
  { fieldType: 'city', terms: ['city', 'town'], weight: 0.58, source: 'text' },
  { fieldType: 'state', terms: ['state', 'province', 'region'], weight: 0.58, source: 'text' },
  { fieldType: 'country', terms: ['country', 'nation'], weight: 0.58, source: 'text' },
  { fieldType: 'postalCode', terms: ['postal code', 'postcode', 'zip code', 'zipcode', 'pincode'], weight: 0.68, source: 'text' },
  { fieldType: 'linkedin', terms: ['linkedin'], weight: 0.78, source: 'text' },
  { fieldType: 'github', terms: ['github'], weight: 0.78, source: 'text' },
  { fieldType: 'portfolio', terms: ['portfolio', 'personal website'], weight: 0.64, source: 'text' },
  { fieldType: 'degree', terms: ['degree', 'qualification'], weight: 0.62, source: 'text' },
  { fieldType: 'college', terms: ['college'], weight: 0.66, source: 'text' },
  { fieldType: 'university', terms: ['university'], weight: 0.66, source: 'text' },
  { fieldType: 'graduationYear', terms: ['graduation year', 'year graduated', 'graduated'], weight: 0.72, source: 'text' },
  { fieldType: 'cgpa', terms: ['cgpa', 'gpa', 'grade point'], weight: 0.72, source: 'text' },
]

const autocompleteSignals: Record<string, Exclude<FieldType, 'unknown'>> = {
  email: 'email',
  tel: 'phone',
  'given-name': 'firstName',
  'family-name': 'lastName',
  name: 'fullName',
  'street-address': 'address',
  'address-level2': 'city',
  'address-level1': 'state',
  country: 'country',
  'postal-code': 'postalCode',
  bday: 'dateOfBirth',
}

function containsTerm(value: string, term: string): boolean {
  return value === term || value.includes(` ${term} `) || value.startsWith(`${term} `) || value.endsWith(` ${term}`)
}

export function createSignals(metadata: FormFieldMetadata, normalizedText: string): FieldSignal[] {
  const signals: FieldSignal[] = []
  const autocomplete = metadata.autocomplete.split(' ').at(-1) ?? ''
  const autocompleteType = autocompleteSignals[autocomplete]

  if (autocompleteType) {
    signals.push({ fieldType: autocompleteType, weight: 0.95, source: 'autocomplete' })
  }
  if (metadata.inputType === 'email') signals.push({ fieldType: 'email', weight: 0.9, source: 'input type' })
  if (metadata.inputType === 'tel') signals.push({ fieldType: 'phone', weight: 0.9, source: 'input type' })
  if (metadata.inputType === 'date') signals.push({ fieldType: 'dateOfBirth', weight: 0.45, source: 'input type' })

  for (const signal of textSignals) {
    if (signal.terms.some((term) => containsTerm(normalizedText, term))) {
      signals.push({ fieldType: signal.fieldType, weight: signal.weight, source: signal.source })
    }
  }

  return signals
}
