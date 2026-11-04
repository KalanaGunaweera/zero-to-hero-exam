// Every student-facing string lives here, in Sinhala.

export const ERRORS: Record<string, string> = {
  DUPLICATE_MOBILE:
    'මෙම දුරකථන අංකයෙන් දැනටමත් ලියාපදිංචි වී ඇත. ඔබගේ ලියාපදිංචි අංකය භාවිතයෙන් නැවත පිවිසෙන්න.',
  INVALID_MOBILE: 'වලංගු ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).',
  INVALID_DISTRICT: 'ලැයිස්තුවෙන් දිස්ත්‍රික්කයක් තෝරන්න.',
  INVALID_INPUT: 'සියලු තොරතුරු නිවැරදිව පුරවන්න.',
  CONSENT_REQUIRED: 'දෙමාපිය / භාරකරු කැමැත්ත ලබා දීම අනිවාර්යයි.',
  REGISTRATION_CLOSED: 'ලියාපදිංචිය දැනට වසා ඇත.',
  NO_ACTIVE_EXAM: 'දැනට විභාගයක් සක්‍රීය නොවේ.',
  INVALID_SESSION: 'ඔබගේ පිවිසුම කල් ඉකුත් වී ඇත. කරුණාකර නැවත පිවිසෙන්න.',
  NO_SESSION: 'විභාගයට පිවිසීමට පෙර ලියාපදිංචි විය යුතුය.',
  RESUME_NOT_FOUND: 'දුරකථන අංකය හෝ ලියාපදිංචි අංකය නොගැළපේ. නැවත පරීක්ෂා කරන්න.',
  RESUME_LOCKED: 'වැරදි උත්සාහයන් වැඩි බැවින් තාවකාලිකව අවහිර කර ඇත. මිනිත්තු 15කට පසු නැවත උත්සාහ කරන්න, නැතහොත් ගුරුතුමා අමතන්න.',
  EXAM_NOT_OPEN: 'විභාගය තවම ආරම්භ කිරීමට විවෘත කර නැත. කරුණාකර පසුව උත්සාහ කරන්න.',
  NO_QUESTIONS: 'විභාගය තවම සූදානම් කර නැත. කරුණාකර පසුව උත්සාහ කරන්න.',
  NOT_STARTED: 'විභාගය තවම ආරම්භ කර නැත.',
  NOT_IN_PROGRESS: 'විභාගය දැනටමත් අවසන් කර ඇත. පිළිතුරු වෙනස් කළ නොහැක.',
  DEADLINE_PASSED: 'නියමිත කාලය අවසන් වී ඇත. පිළිතුරු වෙනස් කළ නොහැක.',
  INVALID_OPTION: 'වලංගු පිළිතුරක් තෝරන්න.',
  INVALID_QUESTION: 'ප්‍රශ්නය හඳුනාගත නොහැක.',
  BAD_REQUEST: 'ඉල්ලීම වලංගු නොවේ.',
  FORBIDDEN: 'මෙම ක්‍රියාව සඳහා අවසර නැත.',
  SERVER_ERROR: 'පද්ධති දෝෂයකි. මොහොතකින් නැවත උත්සාහ කරන්න.',
  NETWORK: 'අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
};

export function errorMessage(code?: string | null): string {
  return (code && ERRORS[code]) || ERRORS.SERVER_ERROR;
}

export const STATUS_SI: Record<string, string> = {
  registered: 'ලියාපදිංචි වී ඇත',
  ready_to_start: 'ආරම්භයට සූදානම්',
  in_progress: 'විභාගය සිදුවෙමින්',
  submitted: 'Submit කර ඇත',
  auto_submitted: 'ස්වයංක්‍රීයව Submit විය',
  expired: 'කාලය ඉකුත් විය',
};
