import { DISTRICT_VALUES } from './districts';

/** Accepts 0771234567, 077 123 4567, +94771234567, 94771234567, 771234567 → 0771234567 */
export function normalizeMobile(raw: string): string | null {
  const digits = (raw || '').replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let local: string;
  if (/^94\d{9}$/.test(digits)) local = '0' + digits.slice(2);
  else if (/^7\d{8}$/.test(digits)) local = '0' + digits;
  else local = digits;
  // Sri Lankan mobile prefixes: 070, 071, 072, 074, 075, 076, 077, 078
  return /^07[0124-8]\d{7}$/.test(local) ? local : null;
}

export type RegistrationInput = {
  fullName: string;
  mobile: string;
  schoolName: string;
  district: string;
  parentName: string;
  consent: boolean;
};

export type FieldErrors = Partial<Record<keyof RegistrationInput, string>>;

const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');

export function validateRegistration(input: Partial<Record<keyof RegistrationInput, unknown>>): {
  data?: RegistrationInput;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};
  const fullName = clean(input.fullName);
  const schoolName = clean(input.schoolName);
  const parentName = clean(input.parentName);
  const district = clean(input.district);
  const mobile = normalizeMobile(clean(input.mobile));
  const consent = input.consent === true;

  if (!fullName) errors.fullName = 'සිසුවාගේ සම්පූර්ණ නම ඇතුළත් කරන්න.';
  else if (fullName.length < 3 || fullName.length > 120) errors.fullName = 'නම අකුරු 3ත් 120ත් අතර විය යුතුය.';

  if (!clean(input.mobile)) errors.mobile = 'ජංගම දුරකථන අංකය ඇතුළත් කරන්න.';
  else if (!mobile) errors.mobile = 'වලංගු ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).';

  if (!schoolName) errors.schoolName = 'පාසලේ නම ඇතුළත් කරන්න.';
  else if (schoolName.length < 2 || schoolName.length > 150) errors.schoolName = 'පාසලේ නම නිවැරදිව ඇතුළත් කරන්න.';

  if (!district) errors.district = 'දිස්ත්‍රික්කය තෝරන්න.';
  else if (!DISTRICT_VALUES.includes(district)) errors.district = 'ලැයිස්තුවෙන් දිස්ත්‍රික්කයක් තෝරන්න.';

  if (!parentName) errors.parentName = 'දෙමාපියන්ගේ / භාරකරුගේ නම ඇතුළත් කරන්න.';
  else if (parentName.length < 3 || parentName.length > 120) errors.parentName = 'නම අකුරු 3ත් 120ත් අතර විය යුතුය.';

  if (!consent) errors.consent = 'ඉදිරියට යාමට දෙමාපිය / භාරකරු කැමැත්ත ලබා දිය යුතුය.';

  if (Object.keys(errors).length) return { errors };
  return { data: { fullName, mobile: mobile!, schoolName, district, parentName, consent }, errors };
}

export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
