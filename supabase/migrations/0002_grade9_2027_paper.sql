-- =====================================================================
-- Grade 9 Mathematics – 2027 paper: 20 questions, 40 minutes.
-- Run after 0001. Safe to run once: it only inserts questions when the
-- active exam has none (edit them later in /admin → Questions).
--
-- Maths markup used in the text (rendered by the app):
--   [[a/b]] stacked fraction      [[√…]] square root with overbar
-- =====================================================================

do $$
declare
  v_exam uuid;
  v_q uuid;
  r record;
begin
  select id into v_exam from public.exams where is_active;
  if v_exam is null then
    raise exception 'No active exam — run 0001 first';
  end if;

  update public.exams set duration_minutes = 40, updated_at = now() where id = v_exam;

  if exists (select 1 from public.questions where exam_id = v_exam) then
    raise notice 'Questions already exist for this exam — not inserting the paper again.';
    return;
  end if;

  for r in
    select * from (values
      (1,  '8, 16, 24, 32, .... සංඛ්‍යා රටාවේ ඊළඟ පද දෙක ලියන්න.',
           '45, 50', '60, 70', '40, 48', '40, 50', 3, null),
      (2,  'මීටර 6ක් දිග නූලක් මීටර 1½ ක දිග කැබලි කීයකට කැපිය හැකිද?',
           '4', '6', '5', '8', 1, null),
      (3,  'පළතුරු යුෂ පානයක් සෑදීම සඳහා අඹ හා අන්නාසි 3 : 2 අනුපාතයටද, අන්නාසි හා දොඩම් 3 : 2 අනුපාතයට ද මිශ්‍ර කරයි නම් මිශ්‍රණයේ අඹ : අන්නාසි : දොඩම් අනුපාතය සොයන්න.',
           '3 : 2 : 6', '9 : 6 : 4', '9 : 8 : 4', '10 : 6 : 3', 2, null),
      (4,  'දී ඇති සංඛ්‍යා රේඛාව මත ලකුණු කර ඇති අසමානතාව වීජීය අසමානතාවයකින් ලියා දක්වන්න.',
           '−3 ≤ x ≤ 4', '−3 ≤ x < 4', '−3 < x ≤ 4', '−3 < x < 4', 2, '/questions/q04-number-line.svg'),
      (5,  '[[√2 × 2 × 3 × 3 × 3 × 3]] හි අගය කීයද?',
           '6', '12', '8', '18', 4, null),
      (6,  '[[(+6) × (−4)/(−3) × (−2)]] සුළු කරන්න.',
           '+4', '−4', '−8', '+8', 2, null),
      (7,  '6xy − 8xy² මෙම ප්‍රකාශනය සාධක දෙකක ගුණිතයක් ලෙස ලියන්න.',
           '2x(3 − 4y)', '2xy(3 − 4y)', '2y(3 − 4yx)', '2xy(3x − 4)', 2, null),
      (8,  E'ක්‍රිකට් ක්‍රීඩකයකු තමා සහභාගී වූ ආසන්න තරඟ 5කදී රැස්කළ ලකුණු පහත දැක්වේ. මෙම ලකුණුවල මධ්‍යස්ථය කීයද?\n72, 40, 81, 33, 44',
           '81', '33', '44', '40', 3, null),
      (9,  E'28 × 43 = 1204 නම්,\n0.28 × 43 හි අගය කීයද?',
           '12.04', '120.4', '1.204', '0.1204', 1, null),
      (10, 'a = (−2) නම් a³ හි අගය සොයන්න.',
           '8', '−8', '−6', '6', 2, null),
      (11, 'x හා 42° යනු අනුපූරක කෝණ යුගලයකි. x හි අගය සොයන්න.',
           '72', '138', '48', '68', 3, null),
      (12, '200g ක් 1kg ක ප්‍රතිශතයක් ලෙස ලියන්න.',
           '20%', '25%', '30%', '15%', 1, null),
      (13, 'A = {“රතු වතුර” යන වචනයේ අකුරු} නම් n(A) හි අගය ලියන්න.',
           '3', '5', '4', '2', 1, null),
      (14, E'විසඳන්න.\n2x − 1 = 3',
           'x = 5', 'x = 4', 'x = 3', 'x = 2', 4, null),
      (15, E'සුළු කරන්න.\n[[5/6]] × [[3/4]]',
           '[[5/8]]', '[[5/6]]', '[[7/8]]', '[[3/8]]', 1, null),
      (16, 'දිග 25cm ද, පළල 20cm ද, උස 10cm ද වූ ඝනකාභයක පරිමාව සොයන්න.',
           '5000 cm³', '6000 cm³', '8000 cm³', '9000 cm³', 1, null),
      (17, E'වරහන් ඉවත් කර සුළු කරන්න.\n4(x − 2) + 3x',
           '7x − 6', '7x − 8', '8x − 9', '7x − 5', 2, null),
      (18, '[[√196]] හි අගය ප්‍රථමක සාධක භාවිතයෙන් සොයන්න.',
           '14', '15', '13', '12', 1, null),
      (19, 'පන්තියක මුළු සිසුන් ගණන 40කි. ඉන් 22 ක් ගැහැණු ළමයි වේ. පිරිමි ළමයි ගණන මුළු සිසුන් සංඛ්‍යාවේ ප්‍රතිශතයක් ලෙස දක්වන්න.',
           '40%', '42%', '48%', '45%', 4, null),
      (20, 'බෝතලයක් තුළ පාට පැන්සල් 9ක් ඇත. ඉන් 3ක් රතු පාට ද, 2ක් කොළ පාට ද, අනෙක්වා නිල් පාට ද වේ. බෝතලයෙන් අහඹු ලෙස ඉවතට ගන්නා පැන්සලක් නිල්පාට වීමේ සම්භාවිතාව සොයන්න.',
           '[[4/9]]', '[[5/9]]', '[[9/4]]', '[[9/5]]', 1, null)
    ) as t(pos, txt, o1, o2, o3, o4, correct, img)
  loop
    insert into public.questions (exam_id, position, question_text, image_url, option_1, option_2, option_3, option_4)
    values (v_exam, r.pos, r.txt, r.img, r.o1, r.o2, r.o3, r.o4)
    returning id into v_q;
    insert into public.question_keys (question_id, correct_option) values (v_q, r.correct);
  end loop;
end $$;
