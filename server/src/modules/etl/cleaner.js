/**
 * Maps common messy CSV column name variations to standard field names.
 * This runs BEFORE validation so that "Full Name Pls", "Email Address!!" etc.
 * get normalized to "name", "email" before we check if they exist.
 */
const FIELD_ALIASES = {
  name: [
    'name', 'full name', 'fullname', 'full name pls', 'participant name',
    'nama', 'nama lengkap', 'your name', 'attendee name', 'nama peserta',
    'first name', 'firstname', 'last name', 'lastname'
  ],
  email: [
    'email', 'email address', 'e-mail', 'emailaddress', 'mail',
    'email address!!', 'your email', 'email addr', 'e mail', 'alamat email',
    'contact email', 'email address!', 'email address (required)'
  ],
  phone: [
    'phone', 'phone number', 'phonenumber', 'mobile', 'contact', 'telephone',
    'handphone', 'hp', 'no hp', 'nomor hp', 'phone number (optional)',
    'contact number', 'mobile number', 'whatsapp', 'no. hp', 'no telepon',
    'phone num', 'phone no'
  ],
  company: [
    'company', 'organization', 'organisation', 'employer', 'workplace',
    'where do you work', 'perusahaan', 'instansi', 'company name',
    'where do you work / company', 'where do you work?', 'tempat kerja',
    'institution', 'office', 'kantor', 'company / organization'
  ],
  jobTitle: [
    'job title', 'jobtitle', 'job role', 'role', 'position', 'title',
    'jabatan', 'posisi', 'pekerjaan', 'job role', 'occupation',
    'designation', 'your role', 'current role', 'profesi'
  ],
  industry: [
    'industry', 'sector', 'industry sector', 'field', 'bidang', 'sektor',
    'industri', 'industry/sector', 'area', 'domain', 'industry se'
  ],
  city: [
    'city', 'location', 'city location', 'kota', 'domisili', 'lokasi',
    'city/location', 'city / location', 'asal kota', 'where are you from',
    'region', 'area', 'city locat'
  ]
};

// Build reverse lookup: alias → standard field name
const _aliasMap = {};
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) {
    _aliasMap[alias.toLowerCase().trim()] = field;
  }
}

/**
 * Normalize column names in a raw CSV row.
 * Maps "Full Name Pls" → name, "Email Address!!" → email, etc.
 * Non-standard columns are kept as-is (they become custom survey answers).
 */
function normalizeColumns(rawData) {
  const result = {};
  for (const [key, value] of Object.entries(rawData)) {
    const lk = key.toLowerCase().trim();
    const standardField = _aliasMap[lk];
    if (standardField) {
      // Use standard field name; don't overwrite if already set by a more canonical column
      if (result[standardField] === undefined || result[standardField] === '') {
        result[standardField] = value;
      }
    } else {
      // Keep the original key for custom/survey fields
      result[key] = value;
    }
  }
  return result;
}

function capitalizeWords(str) {
  if (!str) return str;
  return str.trim().split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

function cleanPhone(phone) {
  if (!phone) return phone;
  // Strip everything except plus and digits
  let cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned;
}

function standardizeParticipant(data) {
  const result = { ...data };
  
  if (result.name) result.name = capitalizeWords(result.name);
  if (result.company) result.company = capitalizeWords(result.company);
  if (result.jobTitle) result.jobTitle = capitalizeWords(result.jobTitle);
  if (result.industry) result.industry = capitalizeWords(result.industry);
  if (result.city) result.city = capitalizeWords(result.city);
  if (result.email) result.email = result.email.trim().toLowerCase();
  if (result.phone) result.phone = cleanPhone(result.phone);
  
  return result;
}

module.exports = {
  normalizeColumns,
  standardizeParticipant,
  capitalizeWords,
  cleanPhone
};
