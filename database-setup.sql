-- رفيق القلوب — إنتاج قاعدة البيانات
-- الصق هذا الملف كاملاً في لوحة Neon → SQL Editor → Run.
--
-- الترتيب مهم: طبّق هذا النقل قبل الاعتماد على مُحدِّد المعدل الموزّع
-- (جدول research_rate_limits)؛ بدونه يعمل التطبيق بعدّاد محلي لكل مثيل.

-- ١) سجل جلسات البحث.
--    ملاحظة خصوصية: نص الاستعلام الخام لم يعد يُخزَّن إطلاقاً؛
--    العمود القديم أدناه قابل للفراغ، والنقل يُخفي ما فيه من نصوص سابقة.
CREATE TABLE IF NOT EXISTS research_sessions (
  id serial PRIMARY KEY,
  query text,
  outcome text NOT NULL,
  topic_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  passage_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  passage_count integer NOT NULL DEFAULT 0,
  ai_mode text,
  safety_triggered text NOT NULL DEFAULT 'no',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_sessions_created_at_idx
  ON research_sessions (created_at DESC);

-- ٢) نقل العمود القديم: إسناد الإلزام ثم إخفاء النصوص التاريخية.
--    أمران مكرران آمنان (الإسناد لا يغير شيئاً إن كان العمود أصلاً بلا إلزام،
--    والتحديث لا يطال شيئاً إن كانت النصوص مُخفاة من قبل).
ALTER TABLE research_sessions ALTER COLUMN query DROP NOT NULL;
UPDATE research_sessions SET query = NULL WHERE query IS NOT NULL;
COMMENT ON COLUMN research_sessions.query IS
  'عمود قديم مُبطَل: الصفوف الجديدة لا تكتب نص الاستعلام الخام، والنقل أخفى ما فيه.';

-- ٣) عدّاد حد المعدل الموزّع (٣٠ طلباً/دقيقة لكل مفتاح عميل مشتق بـHMAC).
CREATE TABLE IF NOT EXISTS research_rate_limits (
  client_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (client_key, window_start)
);

-- ٤) أسرار الخادوم: سرّ اشتقاق مفاتيح عملاء حد المعدل يُولَّد تلقائياً عند
--    أول طلب إن لم يوجد. لا تضع هنا أي سرّ خارجي (مفاتيح المزوّدين تبقى في
--    متغيرات بيئة المنصة فقط).
CREATE TABLE IF NOT EXISTS app_secrets (
  purpose text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- استعلام التحقق: يجب أن يعيد سطراً واحداً بأسماء الجداول الثلاثة.
SELECT to_regclass('public.research_sessions')      AS installed_sessions,
       to_regclass('public.research_rate_limits')   AS installed_rate_limits,
       to_regclass('public.app_secrets')            AS installed_secrets;
