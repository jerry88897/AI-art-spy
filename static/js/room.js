// 房間功能模組
class RoomPage {
    constructor(roomId, PlayerId) {
        //參數設定
        this.timeBeforeShowVoteCount = 2000;
        this.timeBeforeShowVoteDetail = 2000;
        this.timeBeforeShowRealSpy = 3000;
        this.timeBeforeShowSpyGuess = 9000;
        this.RouletteTime = 5000;
        this.timeBeforeShowRealTopic = 3000;
        this.timeBeforeShowResult = 3000;
        this.timeBeforeCelebration = 4000;

        this.hasChooseTopic = false;
        this.hasGuessedTopic = false;

        this.cleanUpTime = 2000;

        this.roomId = roomId;
        this.players = [];
        this.currentPlayer = null;
        this.gameData = null;
        this.selectedVoteTarget = null;
        this.selectedGuessOption = null;
        this.selectedAvatar = null;
        this.countdownTimer = null;
        this.myPlayerId = PlayerId || null; // 新增 myPlayerId 屬性
        this.IamSpy = false;
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
            'art-display-interface',
            'spy-voting-interface',
            'real-spy-interface',
            'spy-guess-interface',
            'spy-guess-result-interface',
            'game-result-interface'
        ];
        this.areas = [
            'subject-vote-area',
            'subject-announcement-area',
            'drawing-input-area',
            'art-select-area',
            'art-show-area'
        ]
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

    // 處理開始投票主題
    handleStartVotingTopic(data) {
        if (!data) return;

        this.drawInGamePlayersDisplay();
        this.showGameArea();
        const drawingTips = document.getElementById('drawing-tips');
        drawingTips.innerHTML = '投票選出主題';
        const topicArea = document.getElementById('subject-vote-area');
        topicArea.innerHTML = '';
        data.topics.forEach((topic, index) => {
            const topicItem = document.createElement('div');
            topicItem.className = 'topic-item';
            topicItem.textContent = topic;
            // Add click event to pass the index to window.submitSelectedTopic
            topicItem.addEventListener('click', () => {
                if (window.submitSelectedTopic && !this.hasChooseTopic) {
                    window.submitSelectedTopic(index);
                    this.hasChooseTopic = true;
                }
            });
            topicArea.appendChild(topicItem);
        });
        this.showInterface('drawing-interface');
        this.showArea('subject-vote-area');
    }

    // 處理遊戲開始
    handleGameStarted(data) {
        console.log('Game started:', data);

        if (!data) return;

        this.gameData = data;
        this.IamSpy = data.is_spy;
        this.showGameArea();

        //缺展示提詞畫面
        this.handleTopicAndKeyWordDisplay(data)
        this.handleWriteDrawingPrompt()
        //this.updateProgressIndicator(1);

        GameUtils.showSuccess('遊戲開始！請根據您的角色輸入繪圖提詞');
    }
    handleTopicAndKeyWordDisplay(data) {
        const topicDisplay = document.getElementById('topic-display');
        const keyWordDisplay = document.getElementById('keyWord-display');
        const topicValue = document.getElementById('topic-value');
        const keyWordValue = document.getElementById('keyWord-value');

        if (topicValue) {
            topicValue.textContent = data.topic || '未知主題';
        }

        if (keyWordValue) {
            keyWordValue.textContent = data.keyword || '未知關鍵字';
        }
        topicDisplay.style.display = 'flex';
        keyWordDisplay.style.display = 'flex';
    }

    // 處理輸入繪圖提詞開始
    handleWriteDrawingPrompt() {
        const promptInput = document.getElementById('prompt-text');
        const drawingTips = document.getElementById('drawing-tips');
        if (this.IamSpy) {
            drawingTips.innerHTML = '你是間諜，根據主題畫出模稜兩可的圖片<br>裝作你也知道關鍵字';
        } else {
            drawingTips.innerHTML = '你是畫家，畫出跟關鍵字相關的圖片<br>但留點模糊空間，不要讓對手猜到關鍵字';
        }

        if (promptInput) {
            promptInput.value = '';
        }
        this.showArea('drawing-input-area');
        this.showInterface('drawing-interface')
    }


    handleMyArt(data) {
        if (Array.isArray(data.image_data)) {
            const artworkSelect = document.getElementById('art-select-area');
            if (!artworkSelect) return;

            artworkSelect.innerHTML = ''; // 清空之前的內容
            data.image_data.forEach((imageData, index) => {
                const imgdiv = document.createElement('div');
                imgdiv.className = 'artwork-select-container'; // 可選：添加樣式類名
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${imageData}`;
                img.alt = `Artwork ${index + 1}`;
                img.className = 'artwork-select-image'; // 可選：添加樣式類名


                imgdiv.appendChild(img); // 添加 img 到容器中

                const frameImg = document.createElement('img');
                frameImg.src = `../static/images/frame/default.png`;
                frameImg.className = 'artwork-select-frame'; // 可選：添加樣式類名
                frameImg.addEventListener('click', () => {
                    window.submitSelectedArt(index); // 點擊時觸發並傳送索引值
                });

                imgdiv.appendChild(frameImg); // 添加框架到容器中
                artworkSelect.appendChild(imgdiv); // 添加 imgdiv 到容器中

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
            artImage.className = 'art-show-image';
            artShowContent.appendChild(artImage);
        }
        const artFrame = document.createElement('img');
        artFrame.src = '../static/images/frame/default.png';
        artFrame.className = 'art-show-frame';
        artShowContent.appendChild(artFrame);

        const playerIndex = data.players.findIndex(p => p.id === data.player_id);
        const player = data.players[playerIndex];
        const creatorArtPlace = document.getElementById(`player${playerIndex + 1}-art`);
        if (creatorArtPlace) {
            const inGameArtImageBlock = document.createElement('div');
            inGameArtImageBlock.className = 'in-game-player-art-block';
            const inGameArtImage = document.createElement('img');
            inGameArtImage.src = `data:image/png;base64,${data.selected_art}`;
            inGameArtImage.className = 'in-game-player-art-img';
            const inGameArtFrame = document.createElement('img');
            inGameArtFrame.src = '../static/images/frame/default.png';
            inGameArtFrame.className = 'in-game-player-art-frame';
            inGameArtImageBlock.appendChild(inGameArtImage);
            inGameArtImageBlock.appendChild(inGameArtFrame);
            creatorArtPlace.appendChild(inGameArtImageBlock);
        }
        showingCreatorName.textContent = player ? `${player.name} 的作品` : '未知玩家的作品';
        this.showArea('art-show-area')
    }

    handleStartShowing(data) {
        const artDisplayTips = document.getElementById('art-display-tips');
        if (data.show_art_order[data.now_showing] == this.myPlayerId) {
            artDisplayTips.innerHTML = 'AI驕傲地完成了創作<br>請選擇一個想展示的作品';
            this.showArea('art-select-area')
        } else {
            artDisplayTips.innerHTML = '正在等待其他玩家選擇繪圖...';
            this.showArea('art-waiting-area')
        }
        this.showInterface('art-display-interface')
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
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        wait(this.timeBeforeShowVoteCount)
            .then(() => {
                this.showInterface('real-spy-interface');
                this.generateVoteCountDetail(data);
                this.spyId = data.spy_is;
                return wait(this.timeBeforeShowRealSpy);
            })
            .then(() => {
                this.generateRealSpy(data);
                return wait(this.timeBeforeShowSpyGuess);
            })
            .then(() => {
                document.querySelectorAll('.vote-result-bar').forEach(bar => {
                    bar.classList.add('bounce-out');
                });
                return wait(this.cleanUpTime);
            })
            .then(() => {
                document.querySelectorAll('.vote-result-bar').forEach(bar => {
                    bar.remove();
                });
                this.generateSpyGuessInterface(data);
                this.showInterface('spy-guess-interface');
            });
    }

    // 處理遊戲結束
    handleGameEnded(data) {
        this.showInterface('spy-guess-result-interface');

        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

        this.generateSpyGuessResultInterface(data)
            .then(() => {
                this.generateGameResult(data);
                this.showInterface('game-result-interface');
                return wait(5000);
            })
            .then(() => {
                this.generateGallery(data.gallery);
                this.showContainer('gallery-container');
            });
    }

    // 更新玩家顯示
    drawInGamePlayersDisplay() {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            const player_avatar = document.getElementById(`player${i+1}-avatar`);
            const player_name = document.getElementById(`player${i+1}-name`);
            if (player_avatar) {
                const img = document.createElement('img');
                img.className = 'in-game-avatar-img';
                img.src = `../static/images/avatar/${player.avatar_id}.png`;
                img.alt = `${player.name || 'Unknown'} 的頭像`;
                player_avatar.insertBefore(img, player_avatar.firstChild);
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
    showArea(areaName) {
        this.areas.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = (id === areaName) ? 'flex' : 'none';
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

    // 顯示投票間諜界面
    generateSpyVotingInterface(players) {
        if (!players) return;
        const spyVotingInterface = document.getElementById('spy-voting-options');
        if (!spyVotingInterface) return;

        // 先移除舊的投票按鈕
        document.querySelectorAll('.vote-spy-button').forEach(btn => btn.remove());

        // 建立按鈕並存至陣列
        const voteButtons = [];
        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
            const player = players[playerIndex];
            if (player.id === this.myPlayerId) continue;
            const votePlayerButton = document.createElement('button');
            votePlayerButton.className = 'vote-spy-button bounce-in';
            votePlayerButton.textContent = '票他';
            votePlayerButton.dataset.playerId = player.id;
            voteButtons.push({
                button: votePlayerButton,
                playerId: player.id,
                playerBlockId: `player${playerIndex + 1}`
            });
        }

        // 註冊事件
        voteButtons.forEach(({
            button,
            playerId
        }) => {
            button.addEventListener('click', () => {
                if (window.submitVote) {
                    window.submitVote(playerId);
                }
                // 消滅所有按鈕
                voteButtons.forEach(({
                    button
                }) => {
                    button.className = 'vote-spy-button bounce-out';
                });
                setTimeout(() => {
                    voteButtons.forEach(({
                        button
                    }) => button.remove());
                }, 1000);
            });
        });

        // 插入按鈕
        voteButtons.forEach(({
            button,
            playerBlockId
        }) => {
            const playerBlock = document.getElementById(playerBlockId);
            if (playerBlock) {
                playerBlock.appendChild(button);
            }
        });
    }

    generateVoteCountDetail(data) {
        // 將物件轉換為陣列並迭代
        Object.entries(data.vote_counts).forEach(([playerId, votes]) => {
            const playerIndex = this.players.findIndex(p => p.id === playerId);
            const player = this.players[playerIndex];
            if (!player) return;

            const playerBlock = document.getElementById(`player${playerIndex + 1}`);
            if (!playerBlock) return;
            const voteResultBar = document.createElement('div');
            voteResultBar.className = 'vote-result-bar';
            if ((playerIndex + 1) % 2 === 1) {
                voteResultBar.classList.add('vote-result-L');
            } else {
                voteResultBar.classList.add('vote-result-R');
            }
            const voteCountNumber = document.createElement('div');
            voteCountNumber.className = 'vote-count-number';
            voteCountNumber.textContent = votes || 0;

            voteResultBar.appendChild(voteCountNumber);

            if (votes > 0) {
                const voterList = document.createElement('div');
                voterList.className = 'voter-list'; // Ensure voter-list class is always applied
                if ((playerIndex + 1) % 2 === 1) {
                    voterList.classList.add('vote-result-L');
                } else if ((playerIndex + 1) % 2 === 0) {
                    voterList.classList.add('vote-result-R');
                }
                data.vote_results[player.id].forEach(voterId => {
                    const voter = this.players.find(p => p.id === voterId);
                    const voteItem = document.createElement('div');
                    voteItem.className = 'vote-item';
                    const voterImage = document.createElement('img');
                    voterImage.className = 'voter-image';
                    voterImage.src = `../static/images/avatar/${voter?.avatar_id}.png`;
                    voteItem.appendChild(voterImage);
                    const voterName = document.createElement('div');
                    voterName.className = 'voter-name';
                    voterName.textContent = `${voter?.name || 'Unknown'}`;
                    voteItem.appendChild(voterName);
                    voterList.appendChild(voteItem);
                });
                setTimeout(() => {
                    voteResultBar.appendChild(voterList);
                }, this.timeBeforeShowVoteDetail);
            }
            playerBlock.appendChild(voteResultBar);
        });
    }
    generateRealSpy(data) {
        const body = document.body;
        const gametableContainer = document.getElementById('gametable-container');
        const realSpyInterface = document.getElementById('real-spy-interface');

        body.classList.add('body-dark');
        gametableContainer.classList.add('gametable-container-dark');

        // 輪盤閃爍效果
        this.startAvatarRoulette().then(() => {
            // 創建新的提示元素
            const realSpyTips = document.createElement('div');
            realSpyTips.className = 'drawing-tips';
            realSpyTips.id = 'real-spy-tips';

            // 創建新的顯示區域元素
            const realSpyDisplay = document.createElement('div');
            realSpyDisplay.className = 'real-spy-display';
            realSpyDisplay.id = 'realSpy-display';

            // 創建新的橫幅元素
            const realSpyBanner = document.createElement('div');
            realSpyBanner.className = 'real-spy-banner';
            realSpyBanner.id = 'realSpy-banner';

            // 顯示真正的間諜
            const spy = this.players.find(p => p.id === data.spy_is);
            if (spy) {
                body.classList.add('no-transition');
                gametableContainer.classList.add('no-transition');
                body.classList.remove('body-dark');
                gametableContainer.classList.remove('gametable-container-dark');
                const spyAvatar = document.createElement('img');
                spyAvatar.src = `../static/images/avatar/${spy.avatar_id}.png`;
                spyAvatar.className = 'real-spy-avatar';


                if (data.guess_spy_correct === true) {
                    realSpyTips.textContent = '間諜被大家識破了!';
                    realSpyBanner.textContent = `${spy.name} 是間諜！`;
                    spyAvatar.classList.add('bounce');
                } else {
                    realSpyTips.innerHTML = '間諜沒被識破！<br>取得了一半的勝利!';
                    realSpyBanner.textContent = `${spy.name} 是間諜！`;
                    spyAvatar.classList.add('flip');
                    window.poof(5000);
                }
                realSpyDisplay.appendChild(spyAvatar);
                // 將新元素添加到遊戲桌容器
                realSpyInterface.appendChild(realSpyTips);
                realSpyInterface.appendChild(realSpyDisplay);
                realSpyInterface.appendChild(realSpyBanner);
            }
        });
    }

    // 輪盤閃爍頭像邊框效果
    startAvatarRoulette() {
        const avatars = document.querySelectorAll('.in-game-avatar-img');
        if (!avatars.length) return Promise.resolve();

        avatars.forEach(avatar => avatar.classList.remove('in-game-avatar-img-selected'));

        let index = 0;
        let delay = 500;
        let minDelay = 120;
        let duration = this.RouletteTime;
        let delayStep = 60;
        let step = 0;
        // 依 delay 逐步遞減累加，直到總和超過 duration
        let totalSteps = 0;
        let tempDelay = delay;
        let totalTime = 0;
        while (totalTime < duration) {
            totalTime += tempDelay;
            totalSteps++;
            if (tempDelay > minDelay) {
                tempDelay -= delayStep;
                if (tempDelay < minDelay) tempDelay = minDelay;
            }
        }

        let prevIndex = null;
        return new Promise(resolve => {
            const highlightNext = () => {
                if (prevIndex !== null) {
                    avatars[prevIndex].classList.remove('in-game-avatar-img-selected');
                }
                avatars[index].classList.add('in-game-avatar-img-selected');
                prevIndex = index;
                index = (index + 1) % avatars.length;
                step++;
                if (delay > minDelay) {
                    delay -= delayStep;
                }
                if (step < totalSteps) {
                    setTimeout(highlightNext, delay);
                } else {
                    // 最後只高亮停在的那個
                    avatars[prevIndex].classList.remove('in-game-avatar-img-selected');
                    //avatars[(index + avatars.length - 1) % avatars.length].classList.add('in-game-avatar-img-selected');
                    resolve();
                }
            };
            highlightNext();
        });
    }

    generateSpyGuessInterface(data) {
        const spyGuessInterface = document.getElementById('spy-guess-options');
        const spyGuessTips = document.getElementById('spy-guess-tips');
        if (!spyGuessInterface || !data) return;

        spyGuessInterface.innerHTML = '';
        spyGuessTips.innerHTML = '';

        const spy = this.players.find(p => p.id === data.spy_is);
        if (data.guess_spy_correct === true) {
            spyGuessTips.innerHTML = `${spy.name} 拙劣的演技未能說服大家！<br>但如果 ${spy.name} 猜對了關鍵字，將獲得逆轉勝`;
        } else {
            spyGuessTips.innerHTML = `${spy.name} 精湛的演技騙過了大家！<br>如果 ${spy.name} 猜對了關鍵字，將獲得完全勝利`;
        }

        // 生成猜測選項
        const guessOptions = data.spy_options || [];
        guessOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'guess-option';
            optionElement.textContent = option;

            if (data.spy_is == this.myPlayerId) {
                // 綁定點擊事件
                optionElement.addEventListener('click', () => {
                    if (window.submitGuess && !this.hasGuessedTopic) {
                        window.submitGuess(optionElement.textContent);
                    }
                    this.hasGuessedTopic = true;
                });
            }
            spyGuessInterface.appendChild(optionElement);
        });
    }

    generateSpyGuessResultInterface(data) {
        const spyGuessResultInterface = document.getElementById('spy-guess-result-interface');
        if (!spyGuessResultInterface || !data) return;

        // 清空之前的內容
        spyGuessResultInterface.innerHTML = '';

        const guessResult = document.createElement('div');
        guessResult.className = 'guess-result-block';
        spyGuessResultInterface.appendChild(guessResult);

        return new Promise((resolve) => {
            // 建立 spy-guess-topic-display
            const spyDiv = document.createElement('div');
            spyDiv.className = 'spy-guess-topic-display bounce-in';
            spyDiv.id = 'spy-guess-topic-display';
            spyDiv.innerHTML = `
            <span class="topic-label">間諜猜測</span>
            <span class="topic-value">${data.spyGuess}</span>
        `;
            guessResult.appendChild(spyDiv);

            // 使用 Promise 來處理延遲
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

            const correctDiv = document.createElement('div');
            correctDiv.className = 'spy-guess-topic-display bounce-in';
            correctDiv.id = 'correct-topic-display';

            const answerResultDiv = document.createElement('div');
            answerResultDiv.className = 'answer-result bounce-in';
            answerResultDiv.id = 'answer-result';

            wait(this.timeBeforeShowRealTopic)
                .then(() => {

                    correctDiv.innerHTML = `
                    <span class="topic-label">正確答案</span>
                    <span class="topic-value">${data.correctAnswer}</span>
                `;
                    guessResult.appendChild(correctDiv);
                    return wait(this.timeBeforeShowResult);
                })
                .then(() => {
                    answerResultDiv.textContent = data.correct ? '正確!' : '錯誤!';
                    spyGuessResultInterface.appendChild(answerResultDiv);
                    return wait(this.timeBeforeCelebration);
                }).then(() => {
                    spyDiv.classList.add('bounce-out');
                    correctDiv.classList.add('bounce-out');
                    answerResultDiv.classList.add('bounce-out');
                    return wait(this.cleanUpTime);
                }).then(() => {
                    spyGuessResultInterface.innerHTML = '';
                    resolve();
                });
        });


    }

    generateGameResult(data) {
        const playerCelebrateBlock = document.getElementById('player-celebrate-block');
        const gameResultTips = document.getElementById('game-result-tips');
        if (!playerCelebrateBlock) return;
        if (!data) return;
        // 清空之前的內容
        playerCelebrateBlock.innerHTML = '';
        let resultMessage = '';
        let winners = [];

        if (data.winType === 'commonVictory') {
            // 平民獲勝，過濾掉間諜
            winners = this.players.filter(player => player.id !== this.spyId);
            resultMessage = '畫家獲勝！';
        } else {
            // 間諜獲勝，找到間諜
            winners = this.players.filter(player => player.id === this.spyId);
            if (data.winType === 'spyBigWin') {
                resultMessage = '間諜大獲全勝！';
            } else if (data.winType === 'spyComeback') {
                resultMessage = '間諜逆轉勝！';
            } else {
                resultMessage = '間諜小勝！';
            }
        }
        gameResultTips.textContent = resultMessage;
        winners.forEach(winner => {
            const winnerElement = document.createElement('div');
            winnerElement.className = 'winner-avatar';
            const img = document.createElement('img');
            img.className = 'winner-avatar-img bounce';
            img.src = `../static/images/avatar/${winner.avatar_id}.png`;
            winnerElement.appendChild(img);
            const nameDiv = document.createElement('div');
            nameDiv.textContent = winner.name;
            nameDiv.className = 'winner-name';
            winnerElement.appendChild(nameDiv);
            playerCelebrateBlock.appendChild(winnerElement);
        });

        gameResultTips.textContent = resultMessage;
    }

    generateGallery(data) {
        const galleryContainer = document.getElementById('gallery-container');
        if (!galleryContainer || !data) return;

        // 清空之前的內容
        galleryContainer.innerHTML = '';

        const galleryItemContainer = document.createElement('div');
        galleryItemContainer.className = 'gallery-item-container';


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
                const imgContainer = document.createElement('div');
                imgContainer.className = 'gallery-main-img-container';

                const imgFrame = document.createElement('img');
                imgFrame.src = "../static/images/frame/default.png";
                imgFrame.className = 'gallery-main-img-frame';

                const img = document.createElement('img');
                img.src = `data:image/png;base64,${submitted_data.image_data[submitted_data.selectedImage]}`;
                img.className = 'gallery-main-img';

                imgContainer.appendChild(imgFrame);
                imgContainer.appendChild(img);
                mainItem.appendChild(imgContainer);

                const fi = document.getElementById('follow-interface');

                imgFrame.addEventListener('mouseenter', (e) => {
                    fi.innerHTML = ''; // 清空內容
                    const promptDiv = document.createElement('div');
                    promptDiv.className = 'follow-prompt';
                    promptDiv.textContent = submitted_data.prompt;
                    fi.appendChild(promptDiv);

                    const fiImgContainer = document.createElement('div');
                    fiImgContainer.className = 'follow-img-container';

                    const fiMainImgContainer = document.createElement('div');
                    fiMainImgContainer.className = 'follow-main-img-container';
                    const fiMainImg = document.createElement('img');
                    fiMainImg.className = 'follow-main-img';
                    fiMainImg.src = `data:image/png;base64,${submitted_data.image_data[submitted_data.selectedImage]}`;
                    fiMainImgContainer.appendChild(fiMainImg);

                    const fiMainImgFrame = document.createElement('img');
                    fiMainImgFrame.className = 'follow-main-img-frame';
                    fiMainImgFrame.src = "../static/images/frame/default.png";
                    fiMainImgContainer.appendChild(fiMainImgFrame);

                    fiImgContainer.appendChild(fiMainImgContainer);

                    const noneSelectImgDiv = document.createElement('div');
                    noneSelectImgDiv.className = 'none-select-img-Div';

                    for (let index = 0; index < submitted_data.image_data.length; index++) {
                        if (index !== submitted_data.selectedImage) {
                            const noneSelectImgcontainer = document.createElement('div');
                            noneSelectImgcontainer.className = 'none-select-img-container';

                            const noneSelectImgFrame = document.createElement('img');
                            noneSelectImgFrame.className = 'none-select-img-frame';
                            noneSelectImgFrame.src = "../static/images/frame/default.png";
                            noneSelectImgcontainer.appendChild(noneSelectImgFrame);

                            const img = document.createElement('img');
                            img.className = 'none-select-img';
                            img.src = `data:image/png;base64,${submitted_data.image_data[index] || ''}`;
                            noneSelectImgcontainer.appendChild(img);

                            noneSelectImgDiv.appendChild(noneSelectImgcontainer);
                        }
                    }
                    fiImgContainer.appendChild(noneSelectImgDiv);
                    fi.appendChild(fiImgContainer);
                });

                imgFrame.addEventListener('mousemove', (e) => {
                    const x = e.clientX;
                    const y = e.clientY;
                    const ww = window.innerWidth;
                    const wh = window.innerHeight;

                    // 取得視窗中實際渲染尺寸
                    const fiWidth = getComputedStyle(fi).width.replace('px', '');
                    const fiHeight = getComputedStyle(fi).height.replace('px', '');

                    const fiScaleWidth = window.scaleFactor * fiWidth;
                    const fiScaleHeight = window.scaleFactor * fiHeight;

                    let OFFSET = 20 * window.scaleFactor; // 與滑鼠的間距


                    // 根據滑鼠位置決定顯示方向
                    let left = x + OFFSET;
                    let top = y + OFFSET;

                    // 如果右邊超出螢幕，則顯示在左邊
                    if (left + fiScaleWidth > ww) {
                        left = x - fiScaleWidth - OFFSET;
                    }
                    // 如果左邊超出螢幕，則顯示在右邊
                    if (left < 0) {
                        left = x + OFFSET;
                    }

                    // 如果下方超出螢幕，則顯示在上方
                    if (top + fiScaleHeight > wh) {
                        top = y - fiScaleHeight - OFFSET;
                    }
                    // 如果上方超出螢幕，則顯示在下方
                    if (top < 0) {
                        top = y + OFFSET;
                    }

                    fi.style.transform = `scale(${window.scaleFactor})`;
                    fi.style.left = `${left}px`;
                    fi.style.top = `${top}px`;
                    fi.style.display = 'flex';
                    console.log(`x: ${x}, y: ${y}, ww: ${ww}, wh: ${wh}, fiWidth: ${fiWidth}, fiHeight: ${fiHeight}`, fiScaleWidth, fiScaleHeight);
                });

                imgFrame.addEventListener('mouseleave', () => {
                    fi.style.display = 'none';
                });
            });

            itemElement.appendChild(mainItem);
            itemElement.appendChild(header);

            galleryItemContainer.appendChild(itemElement);
        });
        galleryContainer.appendChild(galleryItemContainer);
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
    // 顯示間諜猜測界面
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