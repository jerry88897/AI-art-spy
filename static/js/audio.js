// 音效系統
class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.7;
        this.initialized = false;
    }

    // 初始化音效系統
    async init() {
        if (this.initialized) return;

        try {
            // 檢查 Web Audio API 支援
            this.audioContext = new(window.AudioContext || window.webkitAudioContext)();

            // 載入音效
            await this.loadSounds();

            // 創建音量控制
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = this.volume;

            this.initialized = true;
            console.log('音效系統初始化完成');
        } catch (error) {
            console.warn('音效系統初始化失敗:', error);
            this.initialized = false;
        }
    }

    // 載入音效檔案
    async loadSounds() {
        const soundEffects = {
            // 使用 Web Audio API 生成音效
            click: this.generateTone(800, 0.1, 'sine'),
            success: this.generateChord([523, 659, 784], 0.3),
            error: this.generateTone(300, 0.3, 'sawtooth'),
            notification: this.generateTone(1000, 0.2, 'sine'),
            gameStart: this.generateChord([392, 494, 587, 698], 0.5),
            gameEnd: this.generateChord([261, 329, 392], 0.8),
            countdown: this.generateTone(600, 0.1, 'square'),
            drawing: this.generateTone(440, 0.2, 'sine'),
            voting: this.generateTone(659, 0.3, 'triangle'),
            victory: this.generateMelody([523, 659, 784, 1047], [0.2, 0.2, 0.2, 0.4]),
            defeat: this.generateMelody([392, 329, 261], [0.3, 0.3, 0.4]),
            join: this.generateTone(523, 0.15, 'sine'),
            leave: this.generateTone(392, 0.15, 'sine'),
            tick: this.generateTone(1200, 0.05, 'sine')
        };

        // 預生成所有音效
        for (const [name, generator] of Object.entries(soundEffects)) {
            try {
                this.sounds[name] = await generator;
            } catch (error) {
                console.warn(`無法載入音效 ${name}:`, error);
            }
        }
    }

    // 生成單一音調
    async generateTone(frequency, duration, waveType = 'sine') {
        if (!this.audioContext) return null;

        return () => {
            if (!this.enabled || !this.initialized) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.gainNode);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = waveType;

            // 音量包絡
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    // 生成和弦
    async generateChord(frequencies, duration) {
        if (!this.audioContext) return null;

        return () => {
            if (!this.enabled || !this.initialized) return;

            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.gainNode);

                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + duration);
                }, index * 50);
            });
        };
    }

    // 生成旋律
    async generateMelody(frequencies, durations) {
        if (!this.audioContext) return null;

        return () => {
            if (!this.enabled || !this.initialized) return;

            let currentTime = 0;
            frequencies.forEach((freq, index) => {
                const duration = durations[index] || 0.2;

                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.gainNode);

                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration - 0.01);

                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + duration);
                }, currentTime * 1000);

                currentTime += duration;
            });
        };
    }

    // 播放音效
    play(soundName) {
        if (!this.enabled || !this.initialized || !this.sounds[soundName]) {
            return;
        }

        try {
            // 確保 AudioContext 已恢復
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            this.sounds[soundName]();
        } catch (error) {
            console.warn(`播放音效 ${soundName} 失敗:`, error);
        }
    }

    // 設定音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
        GameUtils.storage.set('audioVolume', this.volume);
    }

    // 切換音效開關
    toggle() {
        this.enabled = !this.enabled;
        GameUtils.storage.set('audioEnabled', this.enabled);

        // 更新 UI
        this.updateUI();

        // 播放反饋音效
        if (this.enabled) {
            setTimeout(() => this.play('click'), 100);
        }
    }

    // 更新 UI 狀態
    updateUI() {
        const button = document.getElementById('sound-toggle');
        if (button) {
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = this.enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
            }
            button.classList.toggle('muted', !this.enabled);
            button.title = this.enabled ? '關閉音效' : '開啟音效';
        }
    }

    // 播放背景音樂（如果需要）
    playBackgroundMusic() {
        // 實現背景音樂邏輯
        if (!this.enabled) return;

        // 可以在這裡添加背景音樂的實現
        console.log('播放背景音樂');
    }

    // 停止背景音樂
    stopBackgroundMusic() {
        // 實現停止背景音樂邏輯
        console.log('停止背景音樂');
    }

    // 載入設定
    loadSettings() {
        this.enabled = GameUtils.storage.get('audioEnabled', true);
        this.volume = GameUtils.storage.get('audioVolume', 0.7);

        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
    }

    // 建立音效快捷方法
    static createShortcuts(manager) {
        return {
            click: () => manager.play('click'),
            success: () => manager.play('success'),
            error: () => manager.play('error'),
            notification: () => manager.play('notification'),
            gameStart: () => manager.play('gameStart'),
            gameEnd: () => manager.play('gameEnd'),
            countdown: () => manager.play('countdown'),
            drawing: () => manager.play('drawing'),
            voting: () => manager.play('voting'),
            victory: () => manager.play('victory'),
            defeat: () => manager.play('defeat'),
            join: () => manager.play('join'),
            leave: () => manager.play('leave'),
            tick: () => manager.play('tick')
        };
    }
}

// 創建全域音效管理器
window.audioManager = new AudioManager();
window.SFX = null; // 音效快捷方法，將在初始化後設定

// 初始化函數
async function initAudio() {
    try {
        await window.audioManager.init();
        window.audioManager.loadSettings();
        window.audioManager.updateUI();

        // 設定快捷方法
        window.SFX = AudioManager.createShortcuts(window.audioManager);

        console.log('音效系統就緒');
    } catch (error) {
        console.warn('音效系統初始化失敗:', error);
    }
}

// 自動初始化音效系統（需要用戶互動）
document.addEventListener('DOMContentLoaded', () => {
    // 在第一次用戶互動時初始化音效
    const initOnFirstInteraction = () => {
        initAudio();
        document.removeEventListener('click', initOnFirstInteraction);
        document.removeEventListener('keydown', initOnFirstInteraction);
        document.removeEventListener('touchstart', initOnFirstInteraction);
    };

    document.addEventListener('click', initOnFirstInteraction);
    document.addEventListener('keydown', initOnFirstInteraction);
    document.addEventListener('touchstart', initOnFirstInteraction);
});

// 提供給其他模組使用的介面
window.initAudio = initAudio;

// 遊戲音效事件監聽器
document.addEventListener('DOMContentLoaded', () => {
    // 按鈕點擊音效
    document.addEventListener('click', (e) => {
        if (e.target.matches('button, .btn') && window.SFX) {
            window.SFX.click();
        }
    });

    // 輸入框焦點音效
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, textarea') && window.SFX) {
            window.SFX.tick();
        }
    });

    // 模態框開關音效
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('modal')) {
                    if (target.classList.contains('show') && window.SFX) {
                        window.SFX.notification();
                    }
                }
            }
        });
    });

    // 監聽所有模態框的類別變化
    document.querySelectorAll('.modal').forEach(modal => {
        observer.observe(modal, {
            attributes: true
        });
    });
});

// 遊戲特定音效
window.playGameSound = {
    playerJoined: () => window.SFX && window.SFX.join(),
    playerLeft: () => window.SFX && window.SFX.leave(),
    gameStarted: () => window.SFX && window.SFX.gameStart(),
    roundChanged: () => window.SFX && window.SFX.notification(),
    drawingComplete: () => window.SFX && window.SFX.success(),
    votingStarted: () => window.SFX && window.SFX.voting(),
    gameEnded: (isVictory) => {
        if (!window.SFX) return;
        if (isVictory) {
            window.SFX.victory();
        } else {
            window.SFX.defeat();
        }
    },
    countdownTick: () => window.SFX && window.SFX.countdown(),
    error: () => window.SFX && window.SFX.error()
};