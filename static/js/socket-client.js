// WebSocket 客戶端管理
class SocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
        this.roomId = null;
        this.playerId = null;
        this.hasChooseImg = false;

    }

    // 連接到伺服器
    connect() {
        if (this.socket && this.connected) return;

        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay
            });

            this.setupEventListeners();
            console.log('WebSocket 連接中...');
        } catch (error) {
            console.error('WebSocket 連接失敗:', error);
            GameUtils.showError('連接失敗，請檢查網路連接');
        }
    }

    // 設定事件監聽器
    setupEventListeners() {
        if (!this.socket) return;

        // 連接事件
        this.socket.on('connect', () => {
            console.log('WebSocket 已連接');
            this.connected = true;
            this.reconnectAttempts = 0;
            GameUtils.hideLoading();

            if (window.playGameSound) {
                window.playGameSound.playerJoined();
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket 已斷線:', reason);
            this.connected = false;
            GameUtils.showLoading('重新連接中...');
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket 連接錯誤:', error);
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                GameUtils.hideLoading();
                GameUtils.showError('無法連接到伺服器，請重新整理頁面');
            }

        });

        // 房間相關事件
        this.socket.on('room_created', (data) => {
            console.log('房間已建立:', data);

            this.roomId = data.room_id;
            this.playerId = data.player.id;
            GameUtils.gameState.setState('currentRoom', data.room_id);
            GameUtils.gameState.setState('currentPlayer', data.player);
            window.roomPage = new RoomPage(data.room_id, this.playerId);
        });

        this.socket.on('join_room_success', (data) => {
            console.log('成功加入房間:', data);
            this.roomId = data.room_id;
            this.playerId = data.player.id;
            GameUtils.gameState.setState('currentRoom', data.room_id);
            GameUtils.gameState.setState('currentPlayer', data.player);

            window.roomPage = new RoomPage(data.room_id, this.playerId);
        });

        this.socket.on('room_info', (data) => {
            console.log('房間資訊:', data);
            if (window.roomPage) {
                window.roomPage.handleRoomInfo(data);
            }
        });

        this.socket.on('player_joined', (data) => {
            console.log('玩家加入:', data);
            window.roomPage.handlePlayerJoined(data);
        });

        this.socket.on('player_left', (data) => {
            console.log('玩家離開:', data);
            window.roomPage.handlePlayerLeft(data);
        });

        this.socket.on('avatar_changed', (data) => {
            console.log('頭像更換:', data);
            this.emit('avatarChanged', data);
        });

        this.socket.on('start_voting_topic', (data) => {
            console.log('開始投票主題:', data);
            if (window.roomPage) {
                window.roomPage.handleStartVotingTopic(data);
            }
        });

        // 遊戲相關事件
        this.socket.on('game_started', (data) => {
            console.log('遊戲開始:', data);
            if (window.playGameSound) {
                window.playGameSound.gameStarted();
            }
            window.roomPage.handleGameStarted(data)
        });
        this.socket.on('write_drawing_prompt', (data) => {
            console.log('撰寫繪圖提示:', data);
            window.roomPage.handleWriteDrawingPrompt(data)
        });
        this.socket.on('drawing_finished', (data) => {
            console.log('繪圖完成:', data);
            this.send('get_myArt', null)
        });

        this.socket.on('my_art', (data) => {
            console.log('收到繪圖:', data);
            if (window.playGameSound) {
                window.playGameSound.playerJoined();
            }
            window.roomPage.handleMyArt(data);
            this.send('art_received', null)
        });

        this.socket.on('start_showing', (data) => {
            console.log('開始展示繪圖:', data);
            window.roomPage.handleStartShowing(data);
        });
        this.socket.on('art_selected', (data) => {
            console.log('繪圖已選擇:', data);
            window.roomPage.handleArtSelected(data);
        });
        this.socket.on('start_voting_spy', (data) => {
            console.log('開始投票出間諜:', data);
            window.roomPage.handleStartVotingSpy(data);
        });
        this.socket.on('voting_spy_result', (data) => {
            console.log('投票結果:', data);
            window.roomPage.handleSpyVoteResult(data);
        });
        this.socket.on('game_ended', (data) => {
            console.log('遊戲結束:', data);
            const play_again_btn = document.getElementById('play-again-btn');
            play_again_btn.disabled = false;
            if (window.playGameSound) {
                const isVictory = data.winner === 'citizens' ? !data.spy_name : data.spy_name;
                window.playGameSound.gameEnded(isVictory);
            }
            window.roomPage.handleGameEnded(data);
        });
        this.socket.on('player_play_again', (data) => {
            window.roomPage.readyToPlayAgain(data.player_id);
        });

        // 錯誤處理
        this.socket.on('error', (data) => {
            console.error('伺服器錯誤:', data);
            GameUtils.showError(data.message || '發生未知錯誤');

            if (window.playGameSound) {
                window.playGameSound.error();
            }
        });

        // 統計資訊更新
        this.socket.on('stats_updated', (data) => {
            this.emit('statsUpdated', data);
        });
    }

    // 發送事件到伺服器
    send(event, data) {
        data = data || {};
        if (!this.socket || !this.connected) {
            console.warn('WebSocket 未連接，無法發送事件:', event);
            GameUtils.showError('網路連接已斷線');
            return;
        }

        console.log('發送事件:', event, data);
        this.socket.emit(event, data);
    }

    // 註冊事件處理器
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    // 移除事件處理器
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // 觸發事件處理器
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('事件處理器錯誤:', error);
                }
            });
        }
    }

    // 斷開連接
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // 房間操作方法
    createRoom(playerName) {
        this.send('create_room', {
            player_name: playerName
        });
    }

    joinRoom(roomId, playerName) {
        this.send('join_room', {
            room_id: roomId.toUpperCase(),
            player_name: playerName
        });
        this.roomId = roomId.toUpperCase();
    }

    getRoomInfo() {
        this.send('get_room_info', {});
    }

    changeAvatar(avatarId) {
        this.send('change_avatar', {
            avatar_id: avatarId
        });
    }

    startGame() {
        this.send('topic_vote_start');
    }

    submitDrawingPrompt(prompt) {
        this.send('submit_drawing_prompt', {
            prompt: prompt
        });
    }

    submitVote(votedPlayerId) {
        this.send('submit_spy_vote', {
            voted_player_id: votedPlayerId
        });
        console.log('提交投票:', votedPlayerId);
    }

    submitSpyGuess(guessedKeyword) {
        this.send('spy_guess', {
            guessed_keyword: guessedKeyword
        });
    }

    // 獲取房間狀態
    getRoomStatus() {
        this.send('get_room_status');
    }

    // 心跳檢測
    startHeartbeat() {
        setInterval(() => {
            if (this.connected) {
                this.send('ping');
            }
        }, 30000); // 每30秒發送一次心跳
    }
}

// 全域 WebSocket 客戶端實例
window.socketClient = new SocketClient();

// 房間頁面專用方法
window.startGame = () => {
    window.socketClient.startGame();
};
window.submitSelectedTopic = (topicId) => {
    window.socketClient.send('topic_voted', {
        'selected_topic_no': topicId
    });
}

window.submitDrawingPrompt = (prompt) => {
    window.socketClient.submitDrawingPrompt(prompt);
};

window.submitSelectedArt = (artId) => {
    window.socketClient.send('selected_art', {
        'selected_art_no': artId
    });
}

window.submitVote = (votedPlayerId) => {
    window.socketClient.submitVote(votedPlayerId);
};

window.submitGuess = (option) => {
    if (!option) {
        GameUtils.showError('請選擇一個選項進行猜測');
        return;
    }

    window.socketClient.submitSpyGuess(option);
};

window.changeAvatar = (avatarId) => {
    window.socketClient.changeAvatar(avatarId);
};



window.leaveRoom = () => {
    window.socketClient.send('leave_room', {});
    window.socketClient.disconnect();
    window.location.href = '/playgame';
};

window.playAgain = () => {
    const play_again_btn = document.getElementById('play-again-btn');
    play_again_btn.disabled = true;
    window.socketClient.send('play_again', {});
    window.roomPage.readyToPlayAgain(window.socketClient.playerId);
};

window.copyRoomCode = () => {
    const roomCodeEl = document.getElementById('my-room-code');
    const roomCode = roomCodeEl ? roomCodeEl.textContent : null;
    if (roomCode) {
        GameUtils.copyToClipboard(roomCode);
    }
    roomCodeEl.style.animation = 'none';
    roomCodeEl.offsetHeight; /* trigger reflow */
    roomCodeEl.style.animation = null;
};

// 自動連接
document.addEventListener('DOMContentLoaded', () => {
    window.socketClient.connect();
    window.socketClient.startHeartbeat();
});

document.addEventListener('wheel', function (e) {
    if (e.ctrlKey) {
        e.preventDefault(); // 阻止 Ctrl+滾輪縮放
    }
}, {
    passive: false
});

// Declare scaleFactor globally
window.scaleFactor = 1;

function updateAutoScale() {
    const container = document.getElementById('js-scale');
    // 1. 獲取當前視窗尺寸
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 2. 計算兩個方向的縮放比例
    const scaleX = windowWidth / 1920; // 基準寬度
    const scaleY = windowHeight / 1080; // 基準高度

    // 3. 選擇較小比例（確保完全可見）
    const scale = Math.min(scaleX, scaleY) * 0.95; // 留 5% 邊距
    window.scaleFactor = scale; // Declare and assign scaleFactor
    // 4. 應用縮放（關鍵！）
    container.style.transform = `scale(${scale})`;
    window.scaleFactor = scale;

}

// 5. 監聽視窗變化
window.addEventListener('resize', updateAutoScale);
window.addEventListener('load', updateAutoScale);