import type { UserProfile } from '../types/profile'

const completionFields: Array<(profile: UserProfile) => unknown> = [
  (profile) => profile.personal.firstName,
  (profile) => profile.personal.lastName,
  (profile) => profile.personal.email,
  (profile) => profile.personal.phone,
  (profile) => profile.personal.dateOfBirth,
  (profile) => profile.location.address,
  (profile) => profile.location.city,
  (profile) => profile.location.state,
  (profile) => profile.location.country,
  (profile) => profile.location.pincode,
  (profile) => profile.education.degree,
  (profile) => profile.education.college,
  (profile) => profile.education.university,
  (profile) => profile.education.graduationYear,
  (profile) => profile.education.cgpa,
  (profile) => profile.professional.currentRole,
  (profile) => profile.professional.experience,
  (profile) => profile.professional.skills,
  (profile) => profile.professional.linkedin,
  (profile) => profile.professional.github,
  (profile) => profile.professional.portfolio,
  (profile) => profile.jobPreferences.preferredRoles,
  (profile) => profile.jobPreferences.preferredLocations,
  (profile) => profile.jobPreferences.workMode,
  (profile) => profile.jobPreferences.expectedSalary,
  (profile) => profile.jobPreferences.noticePeriod,
]

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== null && value !== undefined && String(value).trim().length > 0
}

export function getProfileCompletion(profile: UserProfile | null): number {
  if (!profile) {
    return 0
  }

  const completedFields = completionFields.filter((getValue) => hasValue(getValue(profile))).length
  return Math.round((completedFields / completionFields.length) * 100)
}

export function isProfileEmpty(profile: UserProfile | null): boolean {
  return getProfileCompletion(profile) === 0
}
