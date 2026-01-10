/**
 * 通知音效服務
 * 管理廚房訂單音效通知，支援音量控制和開關設定
 */

const SETTINGS_KEY = 'notification-sound-settings';
const DEFAULT_SOUND_URL = '/vendor/sounds/notification.mp3';
const FALLBACK_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

interface SoundSettings {
    enabled: boolean;
    volume: number; // 0.0 - 1.0
}

class NotificationSoundService {
    private audio: HTMLAudioElement | null = null;
    private settings: SoundSettings = {
        enabled: true,
        volume: 0.7,
    };
    private initialized: boolean = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadSettings();
        }
    }

    /**
     * 初始化音效（需要在用戶互動後呼叫）
     */
    init(): void {
        if (this.initialized) return;

        try {
            // 嘗試使用本地音效，失敗則使用遠端備援
            this.audio = new Audio(DEFAULT_SOUND_URL);
            this.audio.addEventListener('error', () => {
                if (import.meta.env.DEV) {
                    console.log('Local sound failed, using fallback URL');
                }
                if (this.audio) {
                    this.audio.src = FALLBACK_SOUND_URL;
                }
            });
            this.audio.volume = this.settings.volume;
            this.audio.load();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize notification sound:', error);
        }
    }

    /**
     * 從 localStorage 載入設定
     */
    private loadSettings(): void {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = {
                    enabled: parsed.enabled ?? true,
                    volume: parsed.volume ?? 0.7,
                };
            }
        } catch {
            // 使用預設值
        }
    }

    /**
     * 儲存設定到 localStorage
     */
    private saveSettings(): void {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save sound settings:', error);
        }
    }

    /**
     * 播放通知音效
     */
    play(): void {
        if (!this.settings.enabled || !this.audio) {
            return;
        }

        // 如果尚未初始化，嘗試初始化
        if (!this.initialized) {
            this.init();
        }

        if (this.audio) {
            this.audio.currentTime = 0;
            this.audio.volume = this.settings.volume;
            this.audio.play().catch(error => {
                // 自動播放可能被瀏覽器封鎖
                if (import.meta.env.DEV) {
                    console.log('Sound playback blocked:', error.message);
                }
            });
        }
    }

    /**
     * 播放測試音效
     */
    playTest(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.audio) {
                this.init();
            }

            if (this.audio) {
                this.audio.currentTime = 0;
                this.audio.volume = this.settings.volume;
                this.audio.play()
                    .then(() => {
                        // 播放 1 秒後停止
                        setTimeout(() => {
                            if (this.audio) {
                                this.audio.pause();
                                this.audio.currentTime = 0;
                            }
                            resolve();
                        }, 1000);
                    })
                    .catch(reject);
            } else {
                reject(new Error('Audio not initialized'));
            }
        });
    }

    /**
     * 設定是否啟用音效
     */
    setEnabled(enabled: boolean): void {
        this.settings.enabled = enabled;
        this.saveSettings();
    }

    /**
     * 設定音量
     */
    setVolume(volume: number): void {
        this.settings.volume = Math.max(0, Math.min(1, volume));
        if (this.audio) {
            this.audio.volume = this.settings.volume;
        }
        this.saveSettings();
    }

    /**
     * 取得目前設定
     */
    getSettings(): SoundSettings {
        return { ...this.settings };
    }

    /**
     * 檢查是否已啟用
     */
    isEnabled(): boolean {
        return this.settings.enabled;
    }

    /**
     * 取得目前音量
     */
    getVolume(): number {
        return this.settings.volume;
    }
}

// 建立單例
export const notificationSound = new NotificationSoundService();

// 匯出設定型別
export type { SoundSettings };
