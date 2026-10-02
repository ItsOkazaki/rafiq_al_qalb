// سجل جلسات البحث — أثر تتبعي (trace log) يوثق أن كل نتيجة جاءت من
// الاسترجاع المضبوط: الاستعلام، النتيجة، الموضوعات، الكلمات، والمقاطع المعروضة.
// لاحظ: المادة نفسها (المصادر والمقاطع) مثبتة في الكود المُراجَع، وهذا الجدول
// للتوثيق التشغيلي فقط. أي فشل كتابة هنا لا يؤثر في نتيجة البحث.

import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const researchSessions = pgTable("research_sessions", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  outcome: text("outcome").notNull(), // ok | abstained | safety | fatwa | invalid
  topicIds: jsonb("topic_ids").$type<string[]>().notNull().default([]),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  passageIds: jsonb("passage_ids").$type<string[]>().notNull().default([]),
  passageCount: integer("passage_count").notNull().default(0),
  aiMode: text("ai_mode"), // model | deterministic | null
  safetyTriggered: text("safety_triggered").notNull().default("no"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
