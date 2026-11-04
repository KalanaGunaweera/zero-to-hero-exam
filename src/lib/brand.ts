export const BRAND = {
  name: 'Zero to Hero',
  teacher: 'Kalana Gunaweera',
  teacherSi: 'කලන ගුණවීර',
  phone: '074 168 9755',
  phoneHref: 'tel:+94741689755',
  mode: 'Online – Zoom',
  modeSi: 'Online – Zoom හරහා',
  batch: 'Grade 9 Mathematics – 2027',
  batchSi: '9 ශ්‍රේණිය ගණිතය – 2027',
  coverTitle: 'Grade 9 Maths Class – 2027', // headline on the cover banner
  whatsappHref: 'https://wa.me/94741689755',
  // Drop your real photo/logo into /public with these names
  teacherPhoto: '/brand/teacher.jpg',
  logo: '/brand/logo.svg',
  // Paper size. The exam timer itself comes from exams.duration_minutes in the database.
  exam: { minutes: 40, questions: 20 },
  coverArt: '/brand/cover-art.jpg', // right-hand art from the Facebook cover
} as const;
