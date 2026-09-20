export type WorkMode = 'Remote' | 'Hybrid' | 'On-site'

export interface PersonalInformation {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  dateOfBirth: string | null
}

export interface LocationInformation {
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
}

export interface EducationInformation {
  degree: string | null
  college: string | null
  university: string | null
  graduationYear: number | null
  cgpa: number | null
}

export interface ProfessionalInformation {
  currentRole: string | null
  experience: number | null
  skills: string[]
  linkedin: string | null
  github: string | null
  portfolio: string | null
}

export interface JobPreferences {
  preferredRoles: string[]
  preferredLocations: string[]
  workMode: WorkMode | null
  expectedSalary: number | null
  noticePeriod: number | null
}

export interface UserProfile {
  personal: PersonalInformation
  location: LocationInformation
  education: EducationInformation
  professional: ProfessionalInformation
  jobPreferences: JobPreferences
}

export const emptyProfile: UserProfile = {
  personal: {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    dateOfBirth: null,
  },
  location: {
    address: null,
    city: null,
    state: null,
    country: null,
    pincode: null,
  },
  education: {
    degree: null,
    college: null,
    university: null,
    graduationYear: null,
    cgpa: null,
  },
  professional: {
    currentRole: null,
    experience: null,
    skills: [],
    linkedin: null,
    github: null,
    portfolio: null,
  },
  jobPreferences: {
    preferredRoles: [],
    preferredLocations: [],
    workMode: null,
    expectedSalary: null,
    noticePeriod: null,
  },
}
