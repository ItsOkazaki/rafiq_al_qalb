// سجل جلسات البحث — أثر تتبعي (trace log) يوثق أن كل نتيجة جاءت من
// الاسترجاع المضبوط: النتيجة، الموضوعات، الكلمات، والمقاطع المعروضة.
// نص الاستعلام الخام لم يعد يُخزَّن (العمود قديم، مُبطَل ومُخفى بالنقل).
// لاحظ: المادة نفسها (المصادر والمقاطع) مثبتة في الكود المُراجَع، وهذا الجدول
// للتوثيق التشغيلي فقط. أي فشل كتابة هنا لا يؤثر في نتيجة البحث.

import { integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

export const researchSessions = pgTable("research_sessions", {
  id: serial("id").primaryKey(),
  // عمود قديم: لا تكتب الصفوف الجديدة فيه شيئاً، والنقل يُخفي ما فيه.
  query: text("query"),
  outcome: text("outcome").notNull(), // ok | abstained | safety | fatwa | invalid
  topicIds: jsonb("topic_ids").$type<string[]>().notNull().default([]),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  passageIds: jsonb("passage_ids").$type<string[]>().notNull().default([]),
  passageCount: integer("passage_count").notNull().default(0),
  aiMode: text("ai_mode"), // model | deterministic | null
  safetyTriggered: text("safety_triggered").notNull().default("no"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// عدّاد حد المعدل الموزّع: نافذة ثابتة لكل مفتاح عميل مشتق بـHMAC.
export const researchRateLimits = pgTable(
  "research_rate_limits",
  {
    clientKey: text("client_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.clientKey, table.windowStart] })],
);

// أسرار الخادوم (مثل سرّ اشتقاق مفاتيح عملاء حد المعدل).
export const appSecrets = pgTable("app_secrets", {
  purpose: text("purpose").primaryKey(),
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
