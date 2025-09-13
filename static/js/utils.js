// 工具函數庫
class GameUtils {
    // 顯示載入遮罩
    static showLoading(text = '載入中...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (overlay && loadingText) {
            loadingText.textContent = text;
            overlay.classList.remove('hide');
        }
    }

    // 隱藏載入遮罩
    static hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hide');
        }
    }

    static async preloadStaticImages(imageSrcs) {
        if (!imageSrcs.length) return;

        const imagePromises = imageSrcs.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(src);
                img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
                img.src = src;
            });
        });

        await Promise.all(imagePromises);
    }

    // 顯示錯誤訊息
    static showError(message) {
        const toast = document.getElementById('error-toast');
        const messageEl = document.getElementById('error-message');

        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.classList.add('show');

            // 5秒後自動隱藏
            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    }

    // 隱藏錯誤訊息
    static hideError() {
        const toast = document.getElementById('error-toast');
        if (toast) {
            toast.classList.remove('show');
        }
    }

    // 顯示成功訊息
    static showSuccess(message) {
        const toast = document.getElementById('success-toast');
        const messageEl = document.getElementById('success-message');

        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.classList.add('show');

            // 3秒後自動隱藏
            setTimeout(() => {
                this.hideSuccess();
            }, 3000);
        }
    }

    // 隱藏成功訊息
    static hideSuccess() {
        const toast = document.getElementById('success-toast');
        if (toast) {
            toast.classList.remove('show');
        }
    }

    // 顯示模態框
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // 隱藏模態框
    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 複製文字到剪貼板
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('已複製到剪貼板！');
            return true;
        } catch (err) {
            // 降級處理
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    this.showSuccess('已複製到剪貼板！');
                    return true;
                }
            } catch (err) {
                document.body.removeChild(textArea);
            }

            this.showError('複製失敗，請手動複製');
            return false;
        }
    }

    // 格式化時間
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 倒數計時器
    static createCountdown(duration, callback, tickCallback = null) {
        let timeLeft = duration;

        const tick = () => {
            if (tickCallback) tickCallback(timeLeft);

            if (timeLeft <= 0) {
                if (callback) callback();
                return;
            }

            timeLeft--;
            setTimeout(tick, 1000);
        };

        tick();
    }

    // 生成隨機ID
    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 驗證房間代碼
    static validateRoomCode(code) {
        return /^[A-Z0-9]{8}$/.test(code);
    }

    // 驗證玩家名稱
    static validatePlayerName(name) {
        return name.length >= 1 && name.length <= 12 && name.trim().length > 0;
    }

    // 防抖函數
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 節流函數
    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 格式化日期
    static formatDate(date) {
        return new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }

    // 滾動到元素
    static scrollToElement(element, offset = 0) {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    // 檢查是否在視窗內
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // 動畫元素進入視窗
    static animateOnScroll() {
        const elements = document.querySelectorAll('[data-animate]');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const animation = entry.target.dataset.animate;
                    entry.target.classList.add(`animate-${animation}`);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        elements.forEach(element => {
            observer.observe(element);
        });
    }

    // 圖片延遲載入
    static lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('loading');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => {
            imageObserver.observe(img);
        });
    }

    // 設備檢測
    static getDeviceInfo() {
        const ua = navigator.userAgent;
        return {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isTablet: /iPad|Android(?!.*Mobile)|Silk/i.test(ua),
            isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            browser: this.getBrowser(),
            os: this.getOS()
        };
    }

    static getBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    static getOS() {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS')) return 'iOS';
        return 'Unknown';
    }

    // 本地存儲工具
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('localStorage not available:', e);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('localStorage not available:', e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('localStorage not available:', e);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.warn('localStorage not available:', e);
                return false;
            }
        }
    };

    // 遊戲狀態管理
    static gameState = {
        currentRoom: null,
        currentPlayer: null,
        gamePhase: 'waiting',

        setState(key, value) {
            this[key] = value;
            this.saveToStorage();
        },

        getState(key) {
            return this[key];
        },

        saveToStorage() {
            GameUtils.storage.set('gameState', {
                currentRoom: this.currentRoom,
                currentPlayer: this.currentPlayer,
                gamePhase: this.gamePhase
            });
        },

        loadFromStorage() {
            const saved = GameUtils.storage.get('gameState');
            if (saved) {
                Object.assign(this, saved);
            }
        },

        clear() {
            this.currentRoom = null;
            this.currentPlayer = null;
            this.gamePhase = 'waiting';
            GameUtils.storage.remove('gameState');
        }
    };

    // 音效相關
    static audio = {
        enabled: GameUtils.storage.get('audioEnabled', true),

        toggle() {
            this.enabled = !this.enabled;
            GameUtils.storage.set('audioEnabled', this.enabled);

            // 更新按鈕狀態
            const button = document.getElementById('sound-toggle');
            if (button) {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = this.enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
                }
                button.classList.toggle('muted', !this.enabled);
            }
        },

        play(soundName) {
            if (!this.enabled) return;

            // 這裡可以添加實際的音效播放邏輯
            console.log(`Playing sound: ${soundName}`);
        }
    };
}

// 全域函數 (保持向後相容)
window.showLoading = GameUtils.showLoading.bind(GameUtils);
window.hideLoading = GameUtils.hideLoading.bind(GameUtils);
window.showError = GameUtils.showError.bind(GameUtils);
window.hideError = GameUtils.hideError.bind(GameUtils);
window.showSuccess = GameUtils.showSuccess.bind(GameUtils);
window.hideSuccess = GameUtils.hideSuccess.bind(GameUtils);
window.showModal = GameUtils.showModal.bind(GameUtils);
window.hideModal = GameUtils.hideModal.bind(GameUtils);

window.showErrorToast = GameUtils.showError.bind(GameUtils);
window.hideErrorToast = GameUtils.hideError.bind(GameUtils);
window.showSuccessToast = GameUtils.showSuccess.bind(GameUtils);
window.hideSuccessToast = GameUtils.hideSuccess.bind(GameUtils);

// 模態框控制函數
window.showCreateRoomModal = () => GameUtils.showModal('create-room-modal');
window.hideCreateRoomModal = () => GameUtils.hideModal('create-room-modal');
window.showJoinRoomModal = () => GameUtils.showModal('join-room-modal');
window.hideJoinRoomModal = () => GameUtils.hideModal('join-room-modal');
window.showRulesModal = () => GameUtils.showModal('rules-modal');
window.hideRulesModal = () => GameUtils.hideModal('rules-modal');
window.showAvatarModal = () => GameUtils.showModal('avatar-modal');
window.hideAvatarModal = () => GameUtils.hideModal('avatar-modal');
window.showLeaveConfirmModal = () => GameUtils.showModal('leave-confirm-modal');
window.hideLeaveConfirmModal = () => GameUtils.hideModal('leave-confirm-modal');

// 音效控制
window.toggleSound = () => GameUtils.audio.toggle();

// 初始化遊戲狀態
document.addEventListener('DOMContentLoaded', () => {
    GameUtils.gameState.loadFromStorage();

    // 設定音效按鈕狀態
    const soundButton = document.getElementById('sound-toggle');
    if (soundButton) {
        const icon = soundButton.querySelector('i');
        if (icon) {
            icon.className = GameUtils.audio.enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        }
        soundButton.classList.toggle('muted', !GameUtils.audio.enabled);
    }
});

// 頁面離開前清理
window.addEventListener('beforeunload', () => {
    GameUtils.gameState.saveToStorage();
});

// 鍵盤快捷鍵
document.addEventListener('keydown', (e) => {
    // ESC 關閉模態框
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
    }
});

// 輸出工具類供其他文件使用
window.GameUtils = GameUtils;