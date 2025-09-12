// 首頁功能模組
class HomePage {
    constructor() {
        this.statsInterval = null;
        this.activeRoomsInterval = null;
        this.container = [
            'homepage-container',
            'room-container',
            'gametable-container',
            'gallery-container'
        ]
        this.rulesPage = 1;
        this.init();
    }

    init() {
        this.showContainer('homepage-container');
        this.setupEventListeners();
        this.startStatsUpdate();
        this.setupFormValidation();
        this.initAnimations();
    }

    showContainer(containerName) {
        this.container.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = (id === containerName) ? 'flex' : 'none';
            }
        });
    }

    // 設定事件監聽器
    setupEventListeners() {
        // 建立房間按鈕事件
        const createRoomBtn = document.getElementById('create-room-submit');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCreateRoom();
            });
        }

        // 加入房間按鈕事件
        const joinRoomBtn = document.getElementById('join-room-submit');
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleJoinRoom();
            });
        }

        // 建立房間表單
        const hostNameInput = document.getElementById('host-name');
        if (hostNameInput) {
            hostNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleCreateRoom();
                }
            });

            hostNameInput.addEventListener('input', this.validateHostName.bind(this));
        }

        // 加入房間表單
        const roomCodeInput = document.getElementById('room-code');
        const playerNameInput = document.getElementById('player-name');

        if (roomCodeInput) {
            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (playerNameInput) playerNameInput.focus();
                }
            });

            roomCodeInput.addEventListener('input', (e) => {
                // 自動轉換為大寫
                e.target.value = e.target.value.toUpperCase();
                this.validateRoomCode();
            });
        }

        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleJoinRoom();
                }
            });

            playerNameInput.addEventListener('input', this.validatePlayerName.bind(this));
        }

        // 活躍房間點擊事件（移除，因為不再需要）

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        showCreateRoomModal();
                        break;
                    case 'j':
                        e.preventDefault();
                        showJoinRoomModal();
                        break;
                }
            }
        });
    }

    // 表單驗證設定
    setupFormValidation() {
        // 即時驗證
        const inputs = document.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateInput(input);
            });

            input.addEventListener('input', () => {
                this.clearInputError(input);
            });
        });
    }

    // 驗證輸入框
    validateInput(input) {
        const value = input.value.trim();
        const inputGroup = input.closest('.input-group');

        let isValid = true;
        let errorMessage = '';

        switch (input.id) {
            case 'host-name':
            case 'player-name':
                if (!GameUtils.validatePlayerName(value)) {
                    isValid = false;
                    errorMessage = '名稱長度需在1-12個字元之間';
                }
                break;
            case 'room-code':
                if (!GameUtils.validateRoomCode(value)) {
                    isValid = false;
                    errorMessage = '房間代碼需為8位英數字';
                }
                break;
        }

        if (!isValid) {
            //this.showInputError(inputGroup, errorMessage);
        } else {
            //this.clearInputError(input);
        }

        return isValid;
    }

    // 驗證主持人名稱
    validateHostName() {
        const input = document.getElementById('host-name');
        return this.validateInput(input);
    }

    // 驗證房間代碼
    validateRoomCode() {
        const input = document.getElementById('room-code');
        return this.validateInput(input);
    }

    // 驗證玩家名稱
    validatePlayerName() {
        const input = document.getElementById('player-name');
        return this.validateInput(input);
    }

    // 處理建立房間
    handleCreateRoom() {
        const hostNameInput = document.getElementById('host-name');
        const hostName = hostNameInput && hostNameInput.value ? hostNameInput.value.trim() : '';

        // 驗證主持人名稱
        if (!hostName || !GameUtils.validatePlayerName(hostName)) {
            GameUtils.showError('請輸入有效的玩家名稱（1-12個字元）');
            if (hostNameInput) hostNameInput.focus();
            return;
        }

        // 關閉模態框
        GameUtils.hideModal('create-room-modal');

        // 顯示載入中
        GameUtils.showLoading('建立房間中...');

        // 發送建立房間請求
        if (window.socketClient) {
            window.socketClient.createRoom(hostName);
        }
    }

    // 處理加入房間
    handleJoinRoom() {
        const roomCodeInput = document.getElementById('room-code');
        const playerNameInput = document.getElementById('player-name');
        const roomCode = roomCodeInput && roomCodeInput.value ? roomCodeInput.value.trim().toUpperCase() : '';
        const playerName = playerNameInput && playerNameInput.value ? playerNameInput.value.trim() : '';

        // 驗證房間代碼
        if (!roomCode || !GameUtils.validateRoomCode(roomCode)) {
            GameUtils.showError('請輸入正確的房間代碼（8位英數字）');
            if (roomCodeInput) roomCodeInput.focus();
            return;
        }

        // 驗證玩家名稱
        if (!playerName || !GameUtils.validatePlayerName(playerName)) {
            GameUtils.showError('請輸入有效的玩家名稱（1-12個字元）');
            if (playerNameInput) playerNameInput.focus();
            return;
        }

        // 關閉模態框
        GameUtils.hideModal('join-room-modal');

        // 顯示載入中
        GameUtils.showLoading('加入房間中...');

        // 發送加入房間請求
        if (window.socketClient) {
            window.socketClient.joinRoom(roomCode, playerName);
        }
    }

    // 為特定房間顯示加入對話框
    showJoinRoomForSpecificRoom(roomId) {
        const roomCodeInput = document.getElementById('room-code');
        if (roomCodeInput) {
            roomCodeInput.value = roomId;
        }

        showJoinRoomModal();

        // 聚焦到玩家名稱輸入框
        setTimeout(() => {
            const playerNameInput = document.getElementById('player-name');
            if (playerNameInput) {
                playerNameInput.focus();
            }
        }, 300);
    }

    // 開始統計資料更新
    startStatsUpdate() {
        this.updateStats();
        this.statsInterval = setInterval(() => {
            this.updateStats();
        }, 10000); // 每10秒更新一次
    }

    // 更新統計資料
    updateStats() {
        // 模擬統計資料（實際應用中應該從伺服器獲取）
        const onlinePlayersEl = document.getElementById('online-players');
        const activeRoomsEl = document.getElementById('active-rooms');

        if (onlinePlayersEl) {
            const currentPlayers = parseInt(onlinePlayersEl.textContent) || 0;
            const newPlayers = Math.max(0, currentPlayers + Math.floor(Math.random() * 3 - 1));
            this.animateNumber(onlinePlayersEl, newPlayers);
        }

        if (activeRoomsEl) {
            const currentRooms = parseInt(activeRoomsEl.textContent) || 0;
            const newRooms = Math.max(0, currentRooms + Math.floor(Math.random() * 2 - 0.5));
            this.animateNumber(activeRoomsEl, newRooms);
        }
    }

    // 數字動畫
    animateNumber(element, targetNumber) {
        const currentNumber = parseInt(element.textContent) || 0;
        const difference = targetNumber - currentNumber;
        const steps = 10;
        const stepValue = difference / steps;
        let currentStep = 0;

        const animate = () => {
            if (currentStep < steps) {
                currentStep++;
                const newValue = Math.round(currentNumber + (stepValue * currentStep));
                element.textContent = newValue;
                requestAnimationFrame(animate);
            } else {
                element.textContent = targetNumber;
            }
        };

        if (difference !== 0) {
            animate();
        }
    }

    // 初始化動畫
    initAnimations() {
        // 標題動畫
        const title = document.querySelector('.game-title');
        if (title) {
            title.style.opacity = '0';
            title.style.transform = 'translateY(50px)';

            setTimeout(() => {
                title.style.transition = 'all 0.8s ease';
                title.style.opacity = '1';
                title.style.transform = 'translateY(0)';
            }, 200);
        }

        // 描述動畫
        const description = document.querySelector('.game-description');
        if (description) {
            description.style.opacity = '0';
            description.style.transform = 'translateY(30px)';

            setTimeout(() => {
                description.style.transition = 'all 0.6s ease';
                description.style.opacity = '1';
                description.style.transform = 'translateY(0)';
            }, 400);
        }

        // 按鈕動畫
        const buttons = document.querySelectorAll('.action-buttons .btn');
        buttons.forEach((button, index) => {
            button.style.opacity = '0';
            button.style.transform = 'translateY(30px)';

            setTimeout(() => {
                button.style.transition = 'all 0.5s ease';
                button.style.opacity = '1';
                button.style.transform = 'translateY(0)';
            }, 600 + (index * 100));
        });

        // 統計資料動畫
        const stats = document.querySelectorAll('.stat-item');
        stats.forEach((stat, index) => {
            stat.style.opacity = '0';
            stat.style.transform = 'scale(0.8)';

            setTimeout(() => {
                stat.style.transition = 'all 0.4s ease';
                stat.style.opacity = '1';
                stat.style.transform = 'scale(1)';
            }, 800 + (index * 150));
        });
    }

    // 清理資源
    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.homePage = new HomePage();
});

window.showRules = () => {
    window.homePage.rulesPage = 1;
    const rules = document.getElementById('rules-container');
    const page1 = document.getElementById('rules-page1');
    const pageControlLeft = document.getElementById('page-control-left');
    const allPage = document.querySelectorAll('.rules-page');
    pageControlLeft.style.visibility = 'hidden';
    allPage.forEach(page => {
        page.style.display = 'none';
    })
    page1.style.display = 'flex';
    rules.style.display = 'flex';



}
window.hideRules = () => {
    const rules = document.getElementById('rules-container');
    rules.style.display = 'none';
    window.playGameSound.click();
}

window.changeRulesPage = (direction) => {
    const pageControlLeft = document.getElementById('page-control-left');
    const pageControlRight = document.getElementById('page-control-right');
    if (direction === 1 && window.homePage.rulesPage < 10) {
        const nowPage = document.getElementById(`rules-page${window.homePage.rulesPage}`);
        if (nowPage) {
            nowPage.style.display = 'none';
        }
        const nextPage = document.getElementById(`rules-page${window.homePage.rulesPage + 1}`);
        if (nextPage) {
            nextPage.style.display = 'flex';
        }
        window.homePage.rulesPage += 1;
        if (window.homePage.rulesPage === 10) {
            pageControlRight.style.visibility = 'hidden';
        }
        pageControlLeft.style.visibility = 'visible';
    } else if (direction === -1 && window.homePage.rulesPage > 1) {
        const nowPage = document.getElementById(`rules-page${window.homePage.rulesPage}`);
        if (nowPage) {
            nowPage.style.display = 'none';
        }
        const prevPage = document.getElementById(`rules-page${window.homePage.rulesPage - 1}`);
        if (prevPage) {
            prevPage.style.display = 'flex';
        }
        window.homePage.rulesPage -= 1;
        if (window.homePage.rulesPage === 1) {
            pageControlLeft.style.visibility = 'hidden';
        }
        pageControlRight.style.visibility = 'visible';
    }
    window.playGameSound.click();
}

// 頁面卸載時清理
window.addEventListener('beforeunload', () => {
    if (window.homePage) {
        window.homePage.destroy();
    }
});

// 將處理函數暴露給模板使用
window.handleCreateRoom = () => {
    if (window.homePage) {
        window.homePage.handleCreateRoom();
    }
};

window.handleJoinRoom = () => {
    if (window.homePage) {
        window.homePage.handleJoinRoom();
    }
};

// 模態框開啟時自動聚焦
window.addEventListener('modalOpened', (e) => {
    const modalId = e.detail.modalId;

    setTimeout(() => {
        let focusTarget = null;

        switch (modalId) {
            case 'create-room-modal':
                focusTarget = document.getElementById('host-name');
                break;
            case 'join-room-modal':
                focusTarget = document.getElementById('room-code');
                break;
        }

        if (focusTarget) {
            focusTarget.focus();
            focusTarget.select();
        }
    }, 300);
});

// CSS 樣式增強
const additionalStyles = `
    .input-error {
        color: var(--danger-color);
        font-size: 12px;
        margin-top: 4px;
    }
    
    .room-card.disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
    }
    
    .room-card.disabled:hover {
        transform: none !important;
        box-shadow: var(--shadow) !important;
    }
    
    .room-full-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        font-weight: 500;
    }
    
    .no-rooms {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
        grid-column: 1 / -1;
    }
    
    .no-rooms i {
        font-size: 3rem;
        margin-bottom: 20px;
        opacity: 0.5;
    }
    
    .no-rooms p:first-of-type {
        font-size: 1.2rem;
        margin-bottom: 10px;
        color: var(--text-primary);
    }
    
    .no-rooms p:last-of-type {
        font-size: 1rem;
        opacity: 0.8;
    }
    
    .stat-number {
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    @media (max-width: 768px) {
        .rooms-grid {
            grid-template-columns: 1fr;
        }
        
        .room-card {
            padding: 16px;
        }
        
        .game-stats {
            flex-direction: column;
            gap: 20px;
        }
    }
`;

// 動態添加樣式
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);