/**
 * ResQAI Emergency Contacts & Instant SOS Dispatcher
 * Manages up to 5 family/emergency contacts with WhatsApp, SMS and Web Share API integration.
 */

const STORAGE_KEY = 'resqai_emergency_contacts_v1';

const DEFAULT_CONTACTS = [
  {
    id: 'c1',
    name: 'Anita Sharma (Mother)',
    phone: '+919876543210',
    relation: 'Mother',
    notifyWhatsApp: true,
    notifySMS: true,
    isPrimary: true
  },
  {
    id: 'c2',
    name: 'Rajesh Sharma (Father)',
    phone: '+919876543211',
    relation: 'Father',
    notifyWhatsApp: true,
    notifySMS: true,
    isPrimary: false
  },
  {
    id: 'c3',
    name: 'Pooja Sharma (Spouse/Sister)',
    phone: '+919876543212',
    relation: 'Sibling/Spouse',
    notifyWhatsApp: true,
    notifySMS: false,
    isPrimary: false
  },
  {
    id: 'c4',
    name: 'Dr. Arvind Mehra (Family Doctor)',
    phone: '+919876543213',
    relation: 'Doctor',
    notifyWhatsApp: true,
    notifySMS: true,
    isPrimary: false
  },
  {
    id: 'c5',
    name: 'Vikram Singh (Close Friend)',
    phone: '+919876543214',
    relation: 'Friend',
    notifyWhatsApp: false,
    notifySMS: true,
    isPrimary: false
  }
];

export class ContactManager {
  constructor() {
    this.contacts = this.loadContacts();
  }

  loadContacts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5); // ensure max 5
        }
      }
    } catch (e) {
      console.warn('Could not load contacts:', e);
    }
    this.saveContacts(DEFAULT_CONTACTS);
    return DEFAULT_CONTACTS;
  }

  saveContacts(contacts) {
    this.contacts = contacts.slice(0, 5);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.contacts));
    } catch (e) {
      console.warn('Could not save contacts:', e);
    }
  }

  getContacts() {
    return this.contacts;
  }

  addContact(contact) {
    if (this.contacts.length >= 5) {
      throw new Error('Maximum of 5 emergency contacts allowed.');
    }
    const newContact = {
      id: 'c_' + Date.now(),
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      relation: contact.relation.trim() || 'Family',
      notifyWhatsApp: contact.notifyWhatsApp !== false,
      notifySMS: contact.notifySMS !== false,
      isPrimary: this.contacts.length === 0
    };
    this.contacts.push(newContact);
    this.saveContacts(this.contacts);
    return newContact;
  }

  updateContact(id, updatedFields) {
    this.contacts = this.contacts.map(c => {
      if (c.id === id) {
        return { ...c, ...updatedFields };
      }
      return c;
    });
    this.saveContacts(this.contacts);
  }

  deleteContact(id) {
    this.contacts = this.contacts.filter(c => c.id !== id);
    if (this.contacts.length > 0 && !this.contacts.some(c => c.isPrimary)) {
      this.contacts[0].isPrimary = true;
    }
    this.saveContacts(this.contacts);
  }

  generateSOSMessage(payload) {
    const {
      victimName = 'Ujjwal Tiwari',
      location = { lat: 28.6139, lng: 77.2090, accuracy: 10, address: 'New Delhi, India' },
      incident = { confidence: 94, peakG: 5.6, preCrashSpeed: 52 },
      batteryLevel = 82,
      nearestHospital = { name: 'AIIMS Apex Trauma Center', phone: '+91-11-26598700', distance: '1.4 km' },
      medicalId = { bloodGroup: 'B+', allergies: 'Penicillin' }
    } = payload;

    const mapUrl = `https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `🚨 *EMERGENCY SOS ALERT!* 🚨\n\n` +
      `⚠️ *Severe accident detected for ${victimName}*\n` +
      `⏰ *Time:* ${timeStr}\n` +
      `📊 *AI Crash Confidence:* ${incident.confidence || 95}%\n` +
      `💥 *Impact Force:* ${incident.peakG ? incident.peakG.toFixed(1) + 'G' : '5.2G'} | *Speed:* ${incident.preCrashSpeed || 50} km/h\n` +
      `🔋 *Device Battery:* ${batteryLevel}%\n\n` +
      `📍 *LIVE GPS LOCATION:*\n${mapUrl}\n` +
      `📌 *Approx Address:* ${location.address || 'GPS Coordinates Locked'}\n\n` +
      `🏥 *Nearest Emergency Hospital:*\n` +
      `• ${nearestHospital.name} (${nearestHospital.distance})\n` +
      `• Emergency Line: ${nearestHospital.phone}\n\n` +
      `🩸 *Medical ID:* Blood: ${medicalId.bloodGroup || 'O+'} | Allergies: ${medicalId.allergies || 'None'}\n\n` +
      `🆘 *Action Requested:* Please dispatch an ambulance or contact local emergency services (112) immediately!`;
  }

  getWhatsAppLink(phone, message) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  }

  getSmsLink(phone, message) {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    return `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`;
  }

  async shareViaWebShare(payload) {
    const text = this.generateSOSMessage(payload);
    if (navigator.share) {
      try {
        await navigator.share({
          title: '🚨 CRITICAL SOS: Accident Detected',
          text: text,
          url: `https://maps.google.com/?q=${payload.location?.lat || 28.6139},${payload.location?.lng || 77.2090}`
        });
        return { success: true };
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('Web Share failed:', e);
        }
        return { success: false, error: e.message };
      }
    }
    return { success: false, reason: 'Web Share not supported' };
  }
}
