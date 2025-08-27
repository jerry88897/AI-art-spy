// 房間功能模組
class RoomPage {
    constructor(roomId, PlayerId) {
        this.roomId = roomId;
        this.players = [];
        this.currentPlayer = null;
        this.gameData = null;
        this.selectedVoteTarget = null;
        this.selectedGuessOption = null;
        this.selectedAvatar = null;
        this.countdownTimer = null;
        this.myPlayerId = PlayerId || null; // 新增 myPlayerId 屬性
        this.spyId = null;
        this.homepage_container = document.getElementById('homepage-container');
        this.room_container = document.getElementById('room-container');
        this.gametable_container = document.getElementById('gametable-container');
        this.submitDrawingPromptBtn = document.getElementById('submit-order');

        this.container = [
            'homepage-container',
            'room-container',
            'gametable-container',
            'gallery-container'
        ]
        this.interfaces = [
            'drawing-interface',
            'drawing-waiting-interface',
            'artwork-waiting-interface',
            'artwork-select-interface',
            'art-show-interface',
            'spy-voting-interface',
            'vote-count-interface',
            'spy-guess-interface',
            'spy-guess-result-interface',
            'game-result-interface'
        ];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeRoom();
        this.setupProgressIndicator();
    }

    // 設定事件監聽器
    setupEventListeners() {
        this.submitDrawingPromptBtn.addEventListener("click", () => this.submitDrawingPrompt());
        // 頭像選擇
        document.addEventListener('click', (e) => {
            if (e.target.closest('.avatar-option')) {
                this.selectAvatar(e.target.closest('.avatar-option'));
            }

            // 投票選項點擊
            if (e.target.closest('.vote-option')) {
                this.selectVoteOption(e.target.closest('.vote-option'));
            }

        });
        document.addEventListener('click', (e) => {
            if (e.target.closest('.avatar-option')) {
                this.selectAvatar(e.target.closest('.avatar-option'));
            }

            // 投票選項點擊
            if (e.target.closest('.vote-option')) {
                this.selectVoteOption(e.target.closest('.vote-option'));
            }
        });

        // 字元計數
        const promptInput = document.getElementById('drawing-prompt');
        if (promptInput) {
            promptInput.addEventListener('input', () => this.updateCharCount());
        }

        // 添加滑鼠移動事件監聽器
        window.addEventListener('mousemove', function (event) {
            const followInterface = document.getElementById('FollowInterface');
            if (!followInterface) return;

            const mouseX = event.clientX;
            const mouseY = event.clientY;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let positionX, positionY;

            // 判斷滑鼠所在區域
            if (mouseX < windowWidth / 2) {
                // 左半部
                positionX = mouseX + 10; // 生在指標右邊
            } else {
                // 右半部
                positionX = mouseX - followInterface.offsetWidth - 10; // 生在指標左邊
            }

            if (mouseY < windowHeight / 2) {
                // 上半部
                positionY = mouseY + 10; // 生在指標下方
            } else {
                // 下半部
                positionY = mouseY - followInterface.offsetHeight - 10; // 生在指標上方
            }

            // 設置 FollowInterface 的位置
            followInterface.style.left = `${positionX}px`;
            followInterface.style.top = `${positionY}px`;
        });
    }

    // 初始化房間
    initializeRoom() {
        this.homepage_container.style.display = 'none';
        this.room_container.style.display = 'block';
        this.gametable_container.style.display = 'none';

        // 修正: 使用 GameUtils.hideLoading() 而不是 hideLoading()
        if (typeof GameUtils !== 'undefined' && GameUtils.hideLoading) {
            GameUtils.hideLoading();
        }

        // 檢查是否有保存的遊戲狀態
        const savedState = GameUtils.gameState;
        window.socketClient.getRoomInfo();
        //this.updateRoomInfo();
        this.generateAvatarOptions();
    }


    // 處理房間資訊
    handleRoomInfo(data) {
        console.log('收到房間資訊:', data);

        if (!data) {
            console.error('Room info data is null or undefined');
            return;
        }
        this.roomId = data.room_id;
        this.players = data.players || [];
        this.updatePlayersDisplay();
        this.updateRoomInfo();
        this.checkStartGameButton();

        // 如果數據中包含當前玩家信息，保存它
        if (data.current_player) {
            this.currentPlayer = data.current_player;
            GameUtils.gameState.setState('currentPlayer', data.current_player);
        }
    }

    // 處理重新加入房間
    handleRoomRejoined(data) {
        console.log('重新加入房間成功:', data);

        if (!data) {
            console.error('Room rejoined data is null or undefined');
            return;
        }

        this.players = data.players || [];
        this.currentPlayer = data.player;

        // 保存狀態
        if (data.player) {
            GameUtils.gameState.setState('currentPlayer', data.player);
        }

        this.updatePlayersDisplay();
        this.updateRoomInfo();
        this.checkStartGameButton();

        // 根據遊戲階段顯示相應界面
        if (data.phase === 'drawing') {
            this.showGameArea();
            this.showInterface('drawing-interface')
            this.updateProgressIndicator(data.current_round || 1);
        } else if (data.phase === 'voting') {
            this.showGameArea();
            this.updateProgressIndicator(3);
        } else if (data.phase === 'spy_guess') {
            this.showGameArea();
            this.updateProgressIndicator(4);
        }

        GameUtils.showSuccess('重新連接成功！');
    }

    // 更新房間資訊
    updateRoomInfo() {
        const roomCodeEl = document.getElementById('my-room-code');
        const playerCountEl = document.getElementById('player-count');

        if (roomCodeEl && this.roomId) {
            roomCodeEl.textContent = this.roomId;
            copyRoomCode()
        }

        if (playerCountEl) {
            const playerCount = this.players ? this.players.length : 0;
            playerCountEl.textContent = `${playerCount}/8`;
        }
    }

    // 處理玩家加入
    handlePlayerJoined(data) {
        console.log('有玩家加入房間:', data);

        if (!data) return;

        this.players = data.players || [];
        this.updatePlayersDisplay();
        this.updateRoomInfo();
        this.checkStartGameButton();

        // 顯示通知
        if (data.player && data.player.name) {
            GameUtils.showSuccess(data.player.name + ' 加入了房間');
        }
    }

    // 處理玩家離開
    handlePlayerLeft(data) {
        if (!data) return;

        this.players = data.players || [];
        this.updatePlayersDisplay();
        this.updateRoomInfo();
        this.checkStartGameButton();

        if (data.player_name) {
            GameUtils.showError(data.player_name + ' 離開了房間');
        }
    }

    // 處理頭像更換
    handleAvatarChanged(data) {
        if (!data || !data.player_id) return;

        const player = this.players.find(p => p.id === data.player_id);
        if (player) {
            player.avatar_id = data.avatar_id;
            this.updatePlayersDisplay();
        }
    }

    // 處理遊戲開始
    handleGameStarted(data) {
        console.log('Game started:', data);

        if (!data) return;

        this.gameData = data;
        this.drawInGamePlayersDisplay()
        this.showGameArea();
        this.updateGameInfo(data);

        //缺展示提詞畫面

        this.handleWriteDrawingPrompt()
        //this.updateProgressIndicator(1);

        GameUtils.showSuccess('遊戲開始！請根據您的角色輸入繪圖提詞');
    }

    // 處理輸入繪圖提詞開始
    handleWriteDrawingPrompt() {
        const promptInput = document.getElementById('prompt-text');
        if (promptInput) {
            promptInput.value = '';
        }
        this.showInterface('drawing-interface')
    }


    handleMyArt(data) {
        if (Array.isArray(data.image_data)) {
            const artworkSelect = document.getElementById('artwork-select-interface');
            if (!artworkSelect) return;

            artworkSelect.innerHTML = ''; // 清空之前的內容
            data.image_data.forEach((imageData, index) => {
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${imageData}`;
                img.alt = `Artwork ${index + 1}`;
                img.className = 'artwork-image'; // 可選：添加樣式類名

                img.addEventListener('click', () => {
                    window.submitSelectedArt(index); // 點擊時觸發並傳送索引值
                });

                artworkSelect.appendChild(img); // 添加 img 到容器中
            });
        }
    }

    handleArtSelected(data) {
        const artShowContent = document.getElementById('art-show-content');
        const showingCreatorName = document.getElementById('showing-creator-name');
        const artImage = document.createElement('img');

        artShowContent.innerHTML = '';

        if (artImage && data.selected_art) {
            artImage.src = `data:image/png;base64,${data.selected_art}`;
            artImage.style.display = 'block';
            artImage.className = 'art-show-image';
        }
        artShowContent.appendChild(artImage);
        const player = data.players.find(p => p.id === data.player_id);
        showingCreatorName.textContent = player ? `${player.name} 的作品` : '未知玩家的作品';
        this.showInterface('art-show-interface');
    }

    handleStartShowing(data) {
        if (data.show_art_order[data.now_showing] == this.myPlayerId) {
            this.showInterface('artwork-select-interface')
        } else {
            this.showInterface('artwork-waiting-interface')
        }
    }

    // 處理繪圖錯誤
    handleDrawingError(data) {
        this.hideDrawingWaiting();
        if (data && data.message) {
            GameUtils.showError(data.message);
        }
    }

    handleStartVotingSpy(data) {
        this.generateSpyVotingInterface(data.players);
        this.showInterface('spy-voting-interface');
    }

    handleSpyVoteResult(data) {
        this.generateVoteCountInterface(data);
        this.showInterface('vote-count-interface');
        this.generateSpyGuessInterface(data);
        this.spyId = data.spy_is;
        setTimeout(() => {
            this.showInterface('spy-guess-interface');
        }, 10000);
    }

    // 處理遊戲結束
    handleGameEnded(data) {
        this.generateSpyGuessResultInterface(data);
        this.showInterface('spy-guess-result-interface');
        setTimeout(() => {
            this.generateGameResult(data);
            this.showInterface('game-result-interface');
        }, 5000);
        setTimeout(() => {
            this.generateGallery(data.gallery);
            this.showContainer('gallery-container');
        }, 10000);

    }

    // 更新玩家顯示
    drawInGamePlayersDisplay() {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            const player_avatar = document.getElementById(`player${i+1}-avatar`);
            const player_name = document.getElementById(`player${i+1}-name`);
            if (player_avatar) {
                player_avatar.innerHTML = `<img class="in-game-avatar-img" src="../static/images/avatar/${player.avatar_id}.png" alt="${player.name || 'Unknown'} 的頭像">`;
            }
            if (player_name) {
                player_name.textContent = player.name || 'Unknown';
            }
        }
    }
    updatePlayersDisplay() {
        const playersGrid = document.getElementById('players-grid');
        if (!playersGrid) {
            console.warn('players-grid element not found');
            return;
        }

        console.log('更新玩家顯示:', this.players);

        if (!this.players || this.players.length === 0) {
            playersGrid.innerHTML = '<p>沒有玩家在房間中</p>';
            return;
        }

        playersGrid.innerHTML = this.players.map(player => this.createPlayerCard(player)).join('');
    }

    // 建立玩家卡片
    createPlayerCard(player) {
        if (!player) return '';

        const isCurrentPlayer = this.currentPlayer && this.currentPlayer.id === player.id;
        player.avatar_id;
        let frame = 'metalOld';
        if (player.is_host) {
            frame = 'gold';
        } else if (this.myPlayerId === player.id) {
            frame = 'metalNew';
        }
        return `
            <div class="player-card ${player.is_host ? 'host' : ''} ${isCurrentPlayer ? 'current-player' : ''}" 
                 data-player-id="${player.id}">
                <div class="player-avatar">
                    <img class="player-avatar-img" src="../static/images/avatar/${player.avatar_id}.png" alt="${player.name} 的頭像">
                    <img class="player-frame-img" src="../static/images/frame/${frame}.png">
                </div>
                <div class="player-info">
                    <div class="player-name">${player.name || 'Unknown'}${player.is_host ? ' 房主' : ''}</div>
                    ${isCurrentPlayer ? '<div class="current-player-indicator">您</div>' : ''}
                </div>
            </div>
        `;
    }

    // 檢查開始遊戲按鈕
    checkStartGameButton() {
        const startButton = document.getElementById('start-game-btn');
        if (!startButton) return;
        let isHost = false;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id === this.myPlayerId) {
                isHost = this.players[i].is_host;
                break;
            }
        }
        const canStart = this.players && this.players.length >= 3 && isHost;

        startButton.style.visibility = canStart ? 'visible' : 'hidden';
    }

    // 其餘方法保持不變...
    // [繼續其他方法的實現，這裡只展示修復的關鍵部分]

    // 顯示遊戲區域
    showGameArea() {
        const homepage_container = document.getElementById('homepage-container');
        const room_container = document.getElementById('room-container');
        const gametable_container = document.getElementById('gametable-container');

        homepage_container.style.display = 'none';
        room_container.style.display = 'none';
        gametable_container.style.display = 'flex';
    }

    // 更新遊戲資訊
    updateGameInfo(data) {
        if (!data) return;

        const topicEl = document.getElementById('game-topic');
        const keywordEl = document.getElementById('game-keyword');
        const spyIndicator = document.getElementById('spy-indicator');

        if (topicEl) topicEl.textContent = data.topic || '';

        if (data.is_spy) {
            if (topicEl) topicEl.textContent = data.topic || '';
            if (keywordEl) keywordEl.textContent = '未知' || '';
        } else {
            if (topicEl) topicEl.textContent = data.topic || '';
            if (keywordEl) keywordEl.textContent = data.keyword || '';
        }
    }

    showContainer(containerName) {
        this.container.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = (id === containerName) ? 'flex' : 'none';
            }
        });
    }

    // 只顯示指定的界面
    showInterface(interfaceName) {
        this.interfaces.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = (id === interfaceName) ? 'flex' : 'none';
            }
        });
    }
    // 隱藏所有界面
    hideAllInterfaces() {
        this.interfaces.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    // 顯示作品畫廊
    showArtworksGallery(drawings) {
        const gallery = document.getElementById('artworks-gallery');
        const galleryGrid = document.getElementById('gallery-grid');

        if (!gallery || !galleryGrid || !drawings) return;

        galleryGrid.innerHTML = drawings.map((drawing, index) =>
            this.createArtworkItem(drawing, index)
        ).join('');

        gallery.style.display = 'block';
        gallery.classList.add('show');
    }

    // 建立作品項目
    createArtworkItem(drawing, index) {
        if (!drawing) return '';

        return `
            <div class="artwork-item" style="animation-delay: ${index * 0.1}s">
                <div class="artwork-round">第${drawing.round || 1}輪</div>
                <img src="${drawing.image_data || ''}" alt="${drawing.player_name || 'Unknown'}的作品">
                <div class="artwork-info">
                    <div class="artwork-player">${drawing.player_name || 'Unknown'}</div>
                    <div class="artwork-prompt">"${drawing.prompt || ''}"</div>
                </div>
            </div>
        `;
    }

    // 顯示投票內鬼界面
    generateSpyVotingInterface(players) {
        if (!players) return;
        const spyVotingInterface = document.getElementById('spy-voting-interface');
        if (!spyVotingInterface) return;
        spyVotingInterface.innerHTML = '';

        // 過濾掉當前玩家
        const otherPlayers = players.filter(player => player.id !== this.myPlayerId);

        // 使用迴圈生成按鈕並綁定事件
        for (const player of otherPlayers) {
            const button = document.createElement('button');
            button.className = 'vote-button';
            button.dataset.playerId = player.id;
            button.textContent = player.name || 'Unknown';

            // 綁定點擊事件
            button.addEventListener('click', () => {
                if (window.submitVote) {
                    window.submitVote(player.id);
                }
            });

            spyVotingInterface.appendChild(button);
        }
    }

    generateVoteCountInterface(data) {
        const voteCountInterface = document.getElementById('vote-count-interface');
        if (!voteCountInterface || !data || !data.vote_counts) return;

        voteCountInterface.innerHTML = '';

        // 將物件轉換為陣列並迭代
        Object.entries(data.vote_counts).forEach(([playerId, votes]) => {
            const player = this.players.find(p => p.id === playerId);
            if (!player) return;

            const row = document.createElement('div');
            row.className = 'vote-result-row';

            const nameCell = document.createElement('div');
            nameCell.className = 'vote-result-name';
            nameCell.textContent = player.name || 'Unknown';

            const votesCell = document.createElement('div');
            votesCell.className = 'vote-result-votes';
            votesCell.textContent = `${votes || 0} 票`;

            row.appendChild(nameCell);
            row.appendChild(votesCell);
            voteCountInterface.appendChild(row);
        });
    }

    generateSpyGuessInterface(data) {
        const spyGuessInterface = document.getElementById('spy-guess-interface');
        if (!spyGuessInterface || !data) return;

        spyGuessInterface.innerHTML = '';

        // 生成猜測選項
        const guessOptions = data.spy_options || [];
        guessOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'guess-option';
            optionElement.textContent = option;

            // 綁定點擊事件
            optionElement.addEventListener('click', () => {
                if (data.spy_is == this.myPlayerId) {
                    window.submitGuess(optionElement.textContent)
                }
            });
            spyGuessInterface.appendChild(optionElement);
        });
    }

    generateSpyGuessResultInterface(data) {
        const spyGuessResultInterface = document.getElementById('spy-guess-result-interface');
        if (!spyGuessResultInterface || !data) return;

        // 清空之前的內容
        spyGuessResultInterface.innerHTML = '';

        const spyGuessResult = document.createElement('div');
        spyGuessResult.className = 'spy-guess-result';
        spyGuessResult.innerHTML = `
            <p>內鬼的猜測答案：${data.spyGuess || '未知'}</p>
            <p>真正的答案：${data.correctAnswer || '未知'}</p>
        `;
        spyGuessResultInterface.appendChild(spyGuessResult);


    }

    generateGameResult(data) {
        const gameResultInterface = document.getElementById('game-result-interface');
        if (!gameResultInterface) return;
        if (!data) return;
        // 清空之前的內容
        gameResultInterface.innerHTML = '';
        let resultMessage = '';
        let winners = [];

        if (data.winType === 'commonVictory') {
            // 平民獲勝，過濾掉內鬼
            winners = this.players.filter(player => player.id !== this.spyId);
            resultMessage = '平民獲勝！獲勝玩家：' + winners.map(player => player.name).join(', ');
        } else if (data.winType === 'spyBigWin' || data.winType === 'spyComeback') {
            // 內鬼獲勝，找到內鬼
            winners = this.players.filter(player => player.id === this.spyId);
            if (data.winType === 'spyBigWin') {
                resultMessage = '內鬼大獲全勝！獲勝玩家：' + winners.map(player => player.name).join(', ');
            } else {
                resultMessage = '內鬼逆轉勝！獲勝玩家：' + winners.map(player => player.name).join(', ');
            }
        }

        const resultElement = document.createElement('div');
        resultElement.className = 'game-result-message';
        resultElement.textContent = resultMessage;

        // 添加到界面
        gameResultInterface.appendChild(resultElement);
    }

    generateGallery(data) {
        const galleryContainer = document.getElementById('gallery-container');
        if (!galleryContainer || !data) return;

        // 清空之前的內容
        galleryContainer.innerHTML = '';

        const followInterface = document.createElement('div');
        followInterface.id = 'follow-interface';
        followInterface.className = 'follow-interface';
        galleryContainer.appendChild(followInterface);

        // 生成畫廊項目
        data.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'gallery-item';
            const header = document.createElement('div');
            header.className = 'gallery-item-header';
            header.textContent = `${item.player_name || '未知藝術家'} 的作品`;

            const mainItem = document.createElement('div');
            mainItem.className = 'gallery-main-item-grid';

            item.gallery_data.forEach(submitted_data => {
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${submitted_data.image_data[submitted_data.selectedImage]}`;
                img.alt = `${item.player_name || '未知玩家'}的作品`;
                img.className = 'gallery-main-item';
                mainItem.appendChild(img);

                const fi = document.getElementById('follow-interface');
                const OFFSET = 8; // 與滑鼠的間距


                img.addEventListener('mouseenter', (e) => {
                    fi.innerHTML = ''; // 清空內容

                    const promptDiv = document.createElement('div');
                    promptDiv.className = 'follow-prompt';
                    promptDiv.textContent = `提詞: ${submitted_data.prompt || '未知'}`;
                    fi.appendChild(promptDiv);

                    const noneSelectImgDiv = document.createElement('div');
                    noneSelectImgDiv.className = 'noneSelectImg';

                    submitted_data.image_data
                        .filter((image, index) => index !== submitted_data.selectedImage)
                        .forEach(image => {
                            const img = document.createElement('img');
                            img.src = `data:image/png;base64,${image || ''}`;
                            img.alt = '未選擇的畫作';
                            noneSelectImgDiv.appendChild(img);
                        });
                    fi.appendChild(noneSelectImgDiv);
                });

                img.addEventListener('mousemove', (e) => {
                    const x = e.clientX;
                    const y = e.clientY;
                    const ww = window.innerWidth;
                    const wh = window.innerHeight;

                    // 取得視窗中實際渲染尺寸
                    fi.style.display = 'block'; // 必須先顯示才能取得尺寸
                    const rect = fi.getBoundingClientRect();
                    const fiWidth = rect.width;
                    const fiHeight = rect.height;

                    let left = x < ww / 2 ? (x + OFFSET) : (x - fiWidth - OFFSET);
                    let top = y < wh / 2 ? (y + OFFSET) : (y - fiHeight - OFFSET);

                    // 邊界偵測：避免跑出 viewport
                    left = Math.min(Math.max(left, 0), ww - fiWidth);
                    top = Math.min(Math.max(top, 0), wh - fiHeight);

                    fi.style.left = `${left}px`;
                    fi.style.top = `${top}px`;
                });

                img.addEventListener('mouseleave', () => {
                    fi.style.display = 'none';
                });
            });

            itemElement.appendChild(header);
            itemElement.appendChild(mainItem);

            galleryContainer.appendChild(itemElement);
        });
    }

    showFollowInterface(event, item) {
        let followInterface = document.getElementById('follow-interface');

        // 如果介面不存在，創建一個
        if (!followInterface) {
            followInterface = document.createElement('div');
            followInterface.id = 'follow-interface';
            followInterface.className = 'follow-interface';
            document.body.appendChild(followInterface);
        }

        // 設定內容
        followInterface.innerHTML = `
            <div class="follow-prompt">提詞: ${item.prompt || '未知'}</div>
            <div class="follow-selected">
                <img src="${item.selectedImage || ''}" alt="選擇的畫作">
            </div>
            <div class="follow-other">
                ${item.image_data.map(image => `<img src="${image}" alt="未選擇的畫作">`).join('')}
            </div>
        `;

        // 設定位置
        followInterface.style.top = `${event.clientY + 10}px`;
        followInterface.style.left = `${event.clientX + 10}px`;
        followInterface.style.display = 'block';
    }

    hideFollowInterface() {
        const followInterface = document.getElementById('follow-interface');
        if (followInterface) {
            followInterface.style.display = 'none';
        }
    }

    // 開始投票倒數
    startVotingCountdown(seconds) {
        const countdownEl = document.getElementById('vote-countdown');
        if (!countdownEl) return;

        this.countdownTimer = GameUtils.createCountdown(
            seconds,
            () => {
                // 時間到自動投票
                if (!this.selectedVoteTarget && this.players && this.players.length > 0) {
                    const randomPlayer = this.players[Math.floor(Math.random() * this.players.length)];
                    this.selectedVoteTarget = randomPlayer.id;
                    if (window.submitVote) {
                        window.submitVote();
                    }
                }
            },
            (timeLeft) => {
                if (countdownEl) {
                    countdownEl.textContent = timeLeft;

                    if (timeLeft <= 10 && window.playGameSound) {
                        window.playGameSound.countdownTick();
                    }
                }
            }
        );
    }
    // 顯示內鬼猜測界面
    showSpyGuessInterface(options) {
        this.hideAllInterfaces();
        const spyGuessInterface = document.getElementById('spy-guess-interface');
        const guessOptions = document.getElementById('guess-options');

        if (!spyGuessInterface || !guessOptions || !options) return;

        guessOptions.innerHTML = options.map(option =>
            this.createGuessOption(option)
        ).join('');

        spyGuessInterface.style.display = 'block';
        spyGuessInterface.classList.add('show');
    }

    // 建立猜測選項
    createGuessOption(option) {
        return `
            <div class="guess-option" data-option="${option || ''}">
                ${option || ''}
            </div>
        `;
    }


    // 顯示遊戲結果
    showGameResult(data) {
        this.hideAllInterfaces();
        const gameResult = document.getElementById('game-result');
        const resultIcon = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const resultDetails = document.getElementById('result-details');

        if (!gameResult || !data) return;

        // 設定結果內容
        const isVictory = this.determineVictory(data);

        if (resultIcon) {
            resultIcon.innerHTML = isVictory ?
                '<i class="fas fa-trophy"></i>' :
                '<i class="fas fa-skull"></i>';
            resultIcon.className = `result-icon ${isVictory ? 'victory' : 'defeat'}`;
        }

        if (resultTitle) {
            resultTitle.textContent = isVictory ? '勝利！' : '失敗！';
        }

        if (resultMessage) {
            resultMessage.textContent = data.message || '';
        }

        if (resultDetails) {
            resultDetails.innerHTML = this.createResultDetails(data);
        }

        gameResult.style.display = 'block';
        gameResult.classList.add('show');
    }


    // 提交繪圖提詞
    submitDrawingPrompt() {
        const promptInput = document.getElementById('prompt-text');
        if (!promptInput) return;

        const prompt = promptInput.value ? promptInput.value.trim() : '';
        if (!prompt) {
            GameUtils.showError('請輸入繪圖提詞');
            return;
        }

        window.socketClient.submitDrawingPrompt(prompt);
    }

    // 顯示頭像選擇
    showAvatarSelection() {
        this.generateAvatarOptions();
        if (window.showAvatarModal) {
            window.showAvatarModal();
        }
    }

    // 生成頭像選項
    generateAvatarOptions() {
        const avatarGrid = document.getElementById('avatar-grid');
        if (!avatarGrid) return;

        const avatars = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃'];

        avatarGrid.innerHTML = avatars.map((emoji, index) => `
            <div class="avatar-option" data-avatar-id="${index + 1}">
                ${emoji}
            </div>
        `).join('');
    }

    // 選擇頭像
    selectAvatar(option) {
        if (!option) return;

        document.querySelectorAll('.avatar-option').forEach(opt =>
            opt.classList.remove('selected'));

        option.classList.add('selected');
        this.selectedAvatar = option.dataset.avatarId;
    }

    // 確認頭像更換
    confirmAvatarChange() {
        if (this.selectedAvatar) {
            window.socketClient.changeAvatar(parseInt(this.selectedAvatar));
            if (window.hideAvatarModal) {
                window.hideAvatarModal();
            }
        }
    }

    // 設定進度指示器
    setupProgressIndicator() {
        const progressSteps = document.querySelectorAll('.step');
        progressSteps.forEach((step, index) => {
            step.addEventListener('click', () => {
                // 可以添加步驟說明或其他交互
            });
        });
    }

    // 更新進度指示器
    updateProgressIndicator(step) {
        const steps = document.querySelectorAll('.step');

        steps.forEach((stepEl, index) => {
            stepEl.classList.remove('active', 'completed');

            if (index + 1 < step) {
                stepEl.classList.add('completed');
            } else if (index + 1 === step) {
                stepEl.classList.add('active');
            }
        });
    }

    // 再玩一局
    playAgain() {
        window.location.reload();
    }

    // 回到首頁
    backToHome() {
        window.location.href = '/';
    }

    // 清理資源
    destroy() {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
        }

        // 移除事件監聽器 - 使用相同的函數引用
        const socket = window.socketClient;
        if (socket) {
            // 由於我們使用箭頭函數，無法直接移除，這裡可以考慮重構或使用其他方式
            console.log('Cleaning up room page resources');
        }
    }
}

// 初始化房間頁面
function initRoom() {
    if (typeof ROOM_ID !== 'undefined') {
        window.roomPage = new RoomPage(ROOM_ID);
    }
}

// 全域函數
window.confirmAvatarChange = () => {
    if (window.roomPage) {
        window.roomPage.confirmAvatarChange();
    }
};

window.playAgain = () => {
    if (window.roomPage) {
        window.roomPage.playAgain();
    }
};

window.backToHome = () => {
    if (window.roomPage) {
        window.roomPage.backToHome();
    }
};

// 頁面卸載時清理
window.addEventListener('beforeunload', () => {
    if (window.roomPage) {
        window.roomPage.destroy();
    }
});