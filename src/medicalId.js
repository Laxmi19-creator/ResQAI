/**
 * ResQAI Medical ID & Emergency Health Vault
 * Provides critical health data to emergency responders and paramedics.
 */

const STORAGE_KEY = 'resqai_medical_id_v1';

const DEFAULT_PROFILE = {
  fullName: 'Ujjwal Tiwari',
  bloodGroup: 'B+',
  age: 22,
  weightKg: 70,
  allergies: 'Penicillin, Dust Mites',
  medications: 'None',
  medicalConditions: 'None',
  organDonor: true,
  insuranceProvider: 'Star Health & Allied Insurance',
  insurancePolicyNumber: 'SH-884920419',
  emergencyNotes: 'Contact primary family contact immediately. Carry EpiPen if experiencing anaphylaxis.'
};

export class MedicalIdManager {
  constructor() {
    this.profile = this.loadProfile();
  }

  loadProfile() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not load medical profile:', e);
    }
    this.saveProfile(DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  }

  saveProfile(profile) {
    this.profile = { ...this.profile, ...profile };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('Could not save medical profile:', e);
    }
  }

  getProfile() {
    return this.profile;
  }
}
