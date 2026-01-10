/**
 * Input Validation 工具
 * 提供統一的輸入驗證函式，防止 XSS 和無效輸入
 */

export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitized?: string;
}

/**
 * 驗證顧客姓名
 * - 長度 2-20 字元
 * - 不允許特殊字元
 */
export function validateCustomerName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: '請輸入姓名' };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: '姓名至少需要 2 個字元' };
    }

    if (trimmed.length > 20) {
        return { valid: false, error: '姓名不能超過 20 個字元' };
    }

    // 禁止特殊字元（允許中文、英文、數字、空格）
    const validNamePattern = /^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/;
    if (!validNamePattern.test(trimmed)) {
        return { valid: false, error: '姓名只能包含中英文、數字和空格' };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * 驗證班級名稱
 * - 長度 2-15 字元
 * - 格式如：一年一班、1-1、A班
 */
export function validateClassName(className: string): ValidationResult {
    if (!className || typeof className !== 'string') {
        return { valid: false, error: '請輸入班級' };
    }

    const trimmed = className.trim();

    if (trimmed.length < 1) {
        return { valid: false, error: '請輸入班級' };
    }

    if (trimmed.length > 15) {
        return { valid: false, error: '班級名稱不能超過 15 個字元' };
    }

    // 允許中文、英文、數字、連字符
    const validClassPattern = /^[a-zA-Z0-9\u4e00-\u9fa5\-]+$/;
    if (!validClassPattern.test(trimmed)) {
        return { valid: false, error: '班級名稱格式不正確' };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * 驗證訂單備註
 * - 長度最多 200 字元
 * - 移除危險 HTML 標籤
 */
export function validateOrderNote(note: string): ValidationResult {
    if (!note) {
        return { valid: true, sanitized: '' };
    }

    if (typeof note !== 'string') {
        return { valid: false, error: '備註格式錯誤' };
    }

    const trimmed = note.trim();

    if (trimmed.length > 200) {
        return { valid: false, error: '備註不能超過 200 個字元' };
    }

    // 移除 HTML 標籤（XSS 防護）
    const sanitized = sanitizeHtml(trimmed);

    return { valid: true, sanitized };
}

/**
 * 驗證價格
 * - 必須是正整數
 * - 範圍 1-9999
 */
export function validatePrice(price: number | string): ValidationResult {
    const num = typeof price === 'string' ? parseInt(price, 10) : price;

    if (isNaN(num)) {
        return { valid: false, error: '請輸入有效價格' };
    }

    if (!Number.isInteger(num)) {
        return { valid: false, error: '價格必須是整數' };
    }

    if (num < 1) {
        return { valid: false, error: '價格必須大於 0' };
    }

    if (num > 9999) {
        return { valid: false, error: '價格不能超過 9999' };
    }

    return { valid: true, sanitized: String(num) };
}

/**
 * 驗證庫存數量
 * - 必須是非負整數
 * - 範圍 0-9999
 */
export function validateStock(stock: number | string): ValidationResult {
    const num = typeof stock === 'string' ? parseInt(stock, 10) : stock;

    if (isNaN(num)) {
        return { valid: false, error: '請輸入有效數量' };
    }

    if (!Number.isInteger(num)) {
        return { valid: false, error: '庫存必須是整數' };
    }

    if (num < 0) {
        return { valid: false, error: '庫存不能為負數' };
    }

    if (num > 9999) {
        return { valid: false, error: '庫存不能超過 9999' };
    }

    return { valid: true, sanitized: String(num) };
}

/**
 * 驗證品項名稱
 * - 長度 1-30 字元
 * - 不允許危險字元
 */
export function validateItemName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: '請輸入品項名稱' };
    }

    const trimmed = name.trim();

    if (trimmed.length < 1) {
        return { valid: false, error: '請輸入品項名稱' };
    }

    if (trimmed.length > 30) {
        return { valid: false, error: '品項名稱不能超過 30 個字元' };
    }

    // 移除 HTML 標籤
    const sanitized = sanitizeHtml(trimmed);

    return { valid: true, sanitized };
}

/**
 * 移除 HTML 標籤（簡易 XSS 防護）
 */
export function sanitizeHtml(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * 還原被 sanitize 的 HTML 實體
 */
export function unsanitizeHtml(input: string): string {
    return input
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');
}

/**
 * 驗證 Email 格式
 */
export function validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: '請輸入 Email' };
    }

    const trimmed = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmed)) {
        return { valid: false, error: 'Email 格式不正確' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Email 過長' };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * 批次驗證訂單輸入
 */
export function validateOrderInput(input: {
    customerName: string;
    customerClass: string;
    note?: string;
}): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    const nameResult = validateCustomerName(input.customerName);
    if (!nameResult.valid) {
        errors.customerName = nameResult.error!;
    }

    const classResult = validateClassName(input.customerClass);
    if (!classResult.valid) {
        errors.customerClass = classResult.error!;
    }

    if (input.note) {
        const noteResult = validateOrderNote(input.note);
        if (!noteResult.valid) {
            errors.note = noteResult.error!;
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}
