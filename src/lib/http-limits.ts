// حدود أجسام الطلبات: قراءة الجسمية بالبث مع حدّ أقصى صارم (٨ ك.ب)
// حتى لا تُستهلك الذاكرة في حمولات أكبر من اللازم.

export const MAX_BODY_BYTES = 8 * 1024;

export type CappedBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "unreadable" };

export async function readCappedBody(
  request: Request,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<CappedBodyResult> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: "too-large" };
  }

  if (!request.body) {
    try {
      const text = await request.text();
      if (text.length > maxBytes) return { ok: false, reason: "too-large" };
      return { ok: true, text };
    } catch {
      return { ok: false, reason: "unreadable" };
    }
  }

  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value?.length ?? 0;
      if (size > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // الإلغاء تنظيف فقط — القرار اتُّخذ بالفعل.
        }
        return { ok: false, reason: "too-large" };
      }
      if (value) parts.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const merged = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  const text = new TextDecoder("utf-8").decode(merged);
  return { ok: true, text };
}
