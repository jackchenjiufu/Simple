/**
 * 统一响应信封（V3 金标准）
 * 所有接口返回 { code, message, data }，错误码统一。
 */
export function ok(message: string, data: unknown = null) {
  return { code: 200, message, data };
}
export function fail(code: number, message: string) {
  return { code, message };
}