// All 25 districts of Sri Lanka. `value` is stored; `si` is shown.
export const DISTRICTS = [
  { value: 'Ampara', si: 'අම්පාර' },
  { value: 'Anuradhapura', si: 'අනුරාධපුරය' },
  { value: 'Badulla', si: 'බදුල්ල' },
  { value: 'Batticaloa', si: 'මඩකලපුව' },
  { value: 'Colombo', si: 'කොළඹ' },
  { value: 'Galle', si: 'ගාල්ල' },
  { value: 'Gampaha', si: 'ගම්පහ' },
  { value: 'Hambantota', si: 'හම්බන්තොට' },
  { value: 'Jaffna', si: 'යාපනය' },
  { value: 'Kalutara', si: 'කළුතර' },
  { value: 'Kandy', si: 'මහනුවර' },
  { value: 'Kegalle', si: 'කෑගල්ල' },
  { value: 'Kilinochchi', si: 'කිලිනොච්චිය' },
  { value: 'Kurunegala', si: 'කුරුණෑගල' },
  { value: 'Mannar', si: 'මන්නාරම' },
  { value: 'Matale', si: 'මාතලේ' },
  { value: 'Matara', si: 'මාතර' },
  { value: 'Monaragala', si: 'මොණරාගල' },
  { value: 'Mullaitivu', si: 'මුලතිව්' },
  { value: 'Nuwara Eliya', si: 'නුවරඑළිය' },
  { value: 'Polonnaruwa', si: 'පොළොන්නරුව' },
  { value: 'Puttalam', si: 'පුත්තලම' },
  { value: 'Ratnapura', si: 'රත්නපුර' },
  { value: 'Trincomalee', si: 'ත්‍රිකුණාමලය' },
  { value: 'Vavuniya', si: 'වවුනියාව' },
] as const;

export const DISTRICT_VALUES: string[] = DISTRICTS.map((d) => d.value);

export function districtSi(value: string): string {
  return DISTRICTS.find((d) => d.value === value)?.si ?? value;
}
