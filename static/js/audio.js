// 音效系統
class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
        this.lastVolume = 0.5;
        this.initialized = false;
        this.loopSounds = [
            "main_menu",
            "room_waiting",
            "vote_topic",
            "artist_drawing",
            "spy_drawing",
            "show_art1",
            "show_art2",
            "vote_spy",
            "gallery"
        ];
        this.nowBackgroundMusic = null;
    }

    // 初始化音效系統
    async init() {
        if (this.initialized) return;

        try {
            // 檢查 Web Audio API 支援
            this.audioContext = new(window.AudioContext || window.webkitAudioContext)();

            // 載入音效
            // await this.loadSounds();

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

    async loadSounds(fileDict) {

        await Promise.all(
            Object.entries(fileDict).map(([name, url]) => {
                return new Promise((resolve, reject) => {
                    const audio = new Audio(url);
                    audio.volume = this.volume;

                    // 如果是需要重複播放的音效
                    if (this.loopSounds.includes(name)) {
                        audio.loop = true;
                    }

                    audio.oncanplaythrough = () => {
                        this.sounds[name] = audio;
                        resolve();
                    };

                    audio.onerror = (error) => {
                        console.warn(`無法載入音效檔案 ${name}:`, error);
                        resolve(); // 確保即使失敗也不會阻止其他音效載入
                    };
                });
            })
        );
        console.log('所有音效載入完成');
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

            // 取得音效物件
            const audio = this.sounds[soundName];
            audio.currentTime = 0; // 從頭播放
            audio.volume = this.volume;
            audio.play();
        } catch (error) {
            console.warn(`播放音效 ${soundName} 失敗:`, error);
        }
    }

    playHmmm() {
        if (!this.enabled || !this.initialized) {
            return;
        }

        const hmmmSounds = [
            'hmmm1', 'hmmm2', 'hmmm3', 'hmmm4',
            'hmmm5', 'hmmm6', 'hmmm7', 'hmmm8'
        ];
        const randomIndex = Math.floor(Math.random() * hmmmSounds.length);
        const selectedSound = hmmmSounds[randomIndex];
        this.play(selectedSound);
    }

    // 設定音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
        // 同步更新所有已載入的音效物件的音量
        for (const sound of Object.values(this.sounds)) {
            if (sound instanceof Audio) {
                sound.volume = this.volume;
            }
        }
        GameUtils.storage.set('audioVolume', this.volume);
    }

    // 播放背景音樂（如果需要）
    playBackgroundMusic(soundName) {
        if (!this.enabled || !this.initialized) {
            return;
        }

        try {
            // 如果已經在播放相同的背景音樂，則不重複播放
            if (this.nowBackgroundMusic === soundName) {
                return;
            } else if (soundName === null) {
                if (this.nowBackgroundMusic !== null) {
                    const currentAudio = this.sounds[this.nowBackgroundMusic];
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                        this.vinyl_stop().then(() => {
                            this.nowBackgroundMusic = null;
                        });
                    }
                }

            } else if (this.nowBackgroundMusic !== null) {
                // 停止目前的背景音樂
                const currentAudio = this.sounds[this.nowBackgroundMusic];
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                    this.vinyl_stop().then(() => {
                        this.nowBackgroundMusic = soundName;
                        // 確保 AudioContext 已恢復
                        if (this.audioContext.state === 'suspended') {
                            this.audioContext.resume();
                        }

                        // 取得音效物件
                        const audio = this.sounds[soundName];
                        audio.currentTime = 0; // 從頭播放
                        audio.volume = this.volume;
                        audio.play();
                    });
                }

            } else {
                this.nowBackgroundMusic = soundName;
                // 確保 AudioContext 已恢復
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }

                // 取得音效物件
                const audio = this.sounds[soundName];
                audio.currentTime = 0; // 從頭播放
                audio.volume = this.volume;
                audio.play();
            }

        } catch (error) {
            console.warn(`播放音效 ${soundName} 失敗:`, error);
        }
    }

    vinyl_stop() {
        return new Promise((resolve, reject) => {
            if (!this.enabled || !this.initialized || !this.sounds['vinyl_stop']) {
                return reject(new Error('音效系統未啟用或音效未載入'));
            }

            try {
                // 確保 AudioContext 已恢復
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }

                // 取得音效物件
                const audio = this.sounds['vinyl_stop'];
                audio.currentTime = 0; // 從頭播放
                audio.volume = this.volume;
                audio.play();

                // 當音效播放結束後解決 Promise
                audio.onended = () => {
                    console.log('音效 vinyl_stop 播放完成');
                    resolve();
                };
            } catch (error) {
                console.warn(`播放音效 vinyl_stop 失敗:`, error);
                reject(error);
            }
        });
    }

    // 停止背景音樂
    stopBackgroundMusic() {
        // 實現停止背景音樂邏輯
        console.log('停止背景音樂');
    }

    // 載入設定
    loadSettings() {
        this.enabled = GameUtils.storage.get('audioEnabled', true);
        this.volume = GameUtils.storage.get('audioVolume', this.volume);
        this.lastVolume = this.volume;
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
    }

    // 建立音效快捷方法
    static createShortcuts(manager) {
        return {
            setVolume: (vol) => manager.setVolume(vol),
            stopMusic: () => manager.playBackgroundMusic(null),
            click: () => manager.play('click'),
            hover: () => manager.play('hover'),
            pop: () => manager.play('pop'),
            error: () => manager.play('error'),
            correct: () => manager.play('correct'),
            main_menu: () => manager.playBackgroundMusic('main_menu'),
            room_waiting: () => manager.playBackgroundMusic('room_waiting'),
            vote_topic: () => manager.playBackgroundMusic('vote_topic'),
            bell_multi: () => manager.play('bell_multi'),
            evil_laugh: () => manager.play('evil_laugh'),
            artist_drawing: () => manager.playBackgroundMusic('artist_drawing'),
            spy_drawing: () => manager.playBackgroundMusic('spy_drawing'),
            dot_printer: () => manager.play('dot_printer'),
            bell: () => manager.play('bell'),
            show_art1: () => manager.playBackgroundMusic('show_art1'),
            show_art2: () => manager.playBackgroundMusic('show_art2'),
            vote_spy: () => manager.playBackgroundMusic('vote_spy'),
            voted_spy: () => manager.play('voted_spy'),
            vote_spy_correct: () => manager.play('vote_spy_correct'),
            vote_spy_wrong: () => manager.play('vote_spy_wrong'),
            drum_roll: () => manager.play('drum_roll'),
            gasp: () => manager.play('gasp'),
            spy_guess: () => manager.playBackgroundMusic('spy_guess'),
            hmmm: () => manager.playHmmm(),
            game_end: () => manager.playBackgroundMusic('game_end'),
            party_blower: () => manager.play('party_blower'),
            cheer: () => manager.play('cheer'),
            yay: () => manager.play('yay'),
            gallery: () => manager.playBackgroundMusic('gallery'),
            ready_play_again: () => manager.play('ready_play_again')
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

        // 設定快捷方法
        window.SFX = AudioManager.createShortcuts(window.audioManager);

        console.log('音效系統就緒');
        if (window.playGameSound) {
            window.playGameSound.main_menu();
        }
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

    window.audioManager.volume = GameUtils.storage.get('audioVolume', window.audioManager.volume);
    window.audioManager.lastVolume = window.audioManager.volume;

    volume = GameUtils.storage.get('audioVolume', this.volume);
    const soundSlider = document.getElementById('volume');
    const volumeIcon = document.getElementById('volume-icon');
    if (volume > 0) {
        volumeIcon.src = "../static/images/icons/Speaker.svg";
    } else {
        volumeIcon.src = "../static/images/icons/SpeakerMute.svg";
    }
    soundSlider.value = volume * 100;

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
            window.SFX.pop();
        }
    });

    const soundSlider = document.getElementById('volume');
    const volumeIcon = document.getElementById('volume-icon');
    if (soundSlider) {
        soundSlider.addEventListener('input', (event) => {
            const volume = event.target.value / 100;
            if (window.SFX && typeof window.SFX.setVolume === 'function') {
                window.SFX.setVolume(volume);
                window.SFX.pop();
                if (volume > 0) {
                    if (window.audioManager.lastVolume === 0) {
                        volumeIcon.src = "../static/images/icons/Speaker.svg"; // 如果 lastVolume 為 0，設為預設值 0.5
                    }
                    window.audioManager.lastVolume = volume; // 只有在非靜音時才更新 lastVolume
                } else {
                    window.audioManager.lastVolume = volume;
                    volumeIcon.src = "../static/images/icons/SpeakerMute.svg";
                }
            }
        });

        // 初始化滑桿的值
        soundSlider.value = window.audioManager.volume * 100;
        window.audioManager.lastVolume = window.audioManager.volume; // 初始化 lastVolume
    }

    volumeIcon.addEventListener('click', () => {
        if (window.audioManager) {
            if (window.audioManager.volume > 0) {
                // 靜音
                window.audioManager.setVolume(0);
                soundSlider.value = 0;
                volumeIcon.src = "../static/images/icons/SpeakerMute.svg";
            } else {
                // 恢復到 lastVolume（如果 lastVolume 為 0，則設為預設 0.5）
                const restoreVolume = window.audioManager.lastVolume > 0 ? window.audioManager.lastVolume : 0.5;
                window.audioManager.setVolume(restoreVolume);
                soundSlider.value = restoreVolume * 100;
                volumeIcon.src = "../static/images/icons/Speaker.svg";
            }
            if (window.SFX && typeof window.SFX.click === 'function') {
                window.SFX.click();
            }
        }


    });

    // 遊戲特定音效
    window.playGameSound = {
        click: () => window.SFX && window.SFX.click(),
        hover: () => window.SFX && window.SFX.hover(),
        stopMusic: () => window.SFX && window.SFX.stopMusic(),
        pop: () => window.SFX && window.SFX.pop(),
        error: () => window.SFX && window.SFX.error(),
        correct: () => window.SFX && window.SFX.correct(),
        main_menu: () => window.SFX && window.SFX.main_menu(),
        room_waiting: () => window.SFX && window.SFX.room_waiting(),
        vote_topic: () => window.SFX && window.SFX.vote_topic(),
        bell_multi: () => window.SFX && window.SFX.bell_multi(),
        evil_laugh: () => window.SFX && window.SFX.evil_laugh(),
        artist_drawing: () => window.SFX && window.SFX.artist_drawing(),
        spy_drawing: () => window.SFX && window.SFX.spy_drawing(),
        dot_printer: () => window.SFX && window.SFX.dot_printer(),
        bell: () => window.SFX && window.SFX.bell(),
        show_art1: () => window.SFX && window.SFX.show_art1(),
        show_art2: () => window.SFX && window.SFX.show_art2(),
        vote_spy: () => window.SFX && window.SFX.vote_spy(),
        voted_spy: () => window.SFX && window.SFX.voted_spy(),
        vote_spy_correct: () => window.SFX && window.SFX.vote_spy_correct(),
        vote_spy_wrong: () => window.SFX && window.SFX.vote_spy_wrong(),
        drum_roll: () => window.SFX && window.SFX.drum_roll(),
        gasp: () => window.SFX && window.SFX.gasp(),
        spy_guess: () => window.SFX && window.SFX.spy_guess(),
        hmmm: () => window.SFX && window.SFX.hmmm(),
        game_end: () => window.SFX && window.SFX.game_end(),
        party_blower: () => window.SFX && window.SFX.party_blower(),
        cheer: () => window.SFX && window.SFX.cheer(),
        yay: () => window.SFX && window.SFX.yay(),
        gallery: () => window.SFX && window.SFX.gallery(),
        ready_play_again: () => window.SFX && window.SFX.ready_play_again()
    };
});