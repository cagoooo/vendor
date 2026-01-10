/**
 * Rate Limiter 服務
 * 防止 API 請求頻率過高，保護系統安全
 */

const SETTINGS_KEY = 'rate-limit-data';

interface RateLimitRecord {
    timestamps: number[];
    blockedUntil?: number;
}

interface RateLimitConfig {
    maxRequests: number;      // 最大請求數
    windowMs: number;         // 時間窗口（毫秒）
    blockDurationMs?: number; // 封鎖持續時間（毫秒）
}

// 預設限制配置
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    order: {
        maxRequests: 10,
        windowMs: 60 * 1000,      // 每分鐘 10 次
        blockDurationMs: 5 * 60 * 1000, // 超過後封鎖 5 分鐘
    },
    login: {
        maxRequests: 5,
        windowMs: 60 * 1000,      // 每分鐘 5 次
        blockDurationMs: 10 * 60 * 1000, // 超過後封鎖 10 分鐘
    },
    api: {
        maxRequests: 100,
        windowMs: 60 * 1000,      // 每分鐘 100 次
        blockDurationMs: 60 * 1000, // 超過後封鎖 1 分鐘
    },
};

class RateLimiterService {
    private records: Map<string, RateLimitRecord> = new Map();

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadFromStorage();
        }
    }

    /**
     * 從 localStorage 載入資料
     */
    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.records = new Map(Object.entries(data));
            }
        } catch {
            // 使用預設空記錄
        }
    }

    /**
     * 儲存到 localStorage
     */
    private saveToStorage(): void {
        try {
            const data = Object.fromEntries(this.records);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save rate limit data:', error);
        }
    }

    /**
     * 清理過期的時間戳記
     */
    private cleanupTimestamps(record: RateLimitRecord, windowMs: number): number[] {
        const now = Date.now();
        return record.timestamps.filter(ts => now - ts < windowMs);
    }

    /**
     * 檢查是否可以執行請求
     * @param key 請求類型（如 'order', 'login'）
     * @param config 自訂限制配置（可選）
     * @returns { allowed: boolean, retryAfter?: number }
     */
    check(key: string, config?: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
        const cfg = config || DEFAULT_CONFIGS[key] || DEFAULT_CONFIGS.api;
        const now = Date.now();

        let record = this.records.get(key) || { timestamps: [] };

        // 檢查是否在封鎖期間
        if (record.blockedUntil && now < record.blockedUntil) {
            return {
                allowed: false,
                retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
            };
        }

        // 清理過期時間戳
        record.timestamps = this.cleanupTimestamps(record, cfg.windowMs);

        // 檢查是否超過限制
        if (record.timestamps.length >= cfg.maxRequests) {
            // 設定封鎖時間
            if (cfg.blockDurationMs) {
                record.blockedUntil = now + cfg.blockDurationMs;
            }
            this.records.set(key, record);
            this.saveToStorage();

            return {
                allowed: false,
                retryAfter: Math.ceil((cfg.blockDurationMs || cfg.windowMs) / 1000),
            };
        }

        return { allowed: true };
    }

    /**
     * 記錄一次請求
     * @param key 請求類型
     */
    record(key: string): void {
        let record = this.records.get(key) || { timestamps: [] };
        record.timestamps.push(Date.now());
        this.records.set(key, record);
        this.saveToStorage();
    }

    /**
     * 檢查並記錄請求（結合 check 和 record）
     * @param key 請求類型
     * @param config 自訂限制配置（可選）
     * @returns { allowed: boolean, retryAfter?: number }
     */
    checkAndRecord(key: string, config?: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
        const result = this.check(key, config);
        if (result.allowed) {
            this.record(key);
        }
        return result;
    }

    /**
     * 重設特定類型的限制記錄
     * @param key 請求類型
     */
    reset(key: string): void {
        this.records.delete(key);
        this.saveToStorage();
    }

    /**
     * 取得剩餘可用請求數
     * @param key 請求類型
     * @param config 自訂限制配置（可選）
     */
    getRemainingRequests(key: string, config?: RateLimitConfig): number {
        const cfg = config || DEFAULT_CONFIGS[key] || DEFAULT_CONFIGS.api;
        const record = this.records.get(key) || { timestamps: [] };
        const validTimestamps = this.cleanupTimestamps(record, cfg.windowMs);
        return Math.max(0, cfg.maxRequests - validTimestamps.length);
    }
}

// 建立單例
export const rateLimiter = new RateLimiterService();

// 匯出類型
export type { RateLimitConfig };
