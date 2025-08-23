import time
import threading
from threading import Timer
from flask import Flask, render_template, request, jsonify, session, Response
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import random
from datetime import datetime
import os
from game_logic import GameManager, Room, Player, SubmittedData
from comfy_client import ComfyUIClient, MockComfyUIClient
from comfy_api_simplified import ComfyApiWrapper, ComfyWorkflowWrapper
import json
import logging
import base64
import secrets

# 配置上傳設定
UPLOAD_FOLDER = 'art_output'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB 最大檔案大小
COMFY_API = 'http://127.0.0.1:8188/'


# 確保 art 資料夾存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 設定日誌
logging.basicConfig(level=logging.INFO)
logging.getLogger('socketio').setLevel(logging.DEBUG)
logging.getLogger('engineio').setLevel(logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['COMFY_API'] = COMFY_API

# 修正 SocketIO 配置 - 移除可能導致問題的參數
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
)
# 遊戲管理器
game_manager = GameManager()

# 測試 GameManager 是否正常工作
logger.info(f'GameManager 初始化完成: {game_manager}')
logger.info(f'GameManager rooms 初始狀態: {game_manager.rooms}')


# 初始化 ComfyUI 客戶端，如果失敗則使用模擬客戶端
try:
    comfy_client = ComfyUIClient()
    # 測試連接
    if not comfy_client.test_connection():
        logger.warning("ComfyUI 服務不可用，將使用模擬客戶端")
        comfy_client = MockComfyUIClient()
except Exception as e:
    logger.warning(f"ComfyUI 初始化失敗: {e}，使用模擬客戶端")
    comfy_client = MockComfyUIClient()

# 遊戲主題和關鍵詞資料庫
# 從 JSON 檔案讀取遊戲主題和關鍵詞資料庫
GAME_TOPICS_FILE = 'key_word.json'

try:
    with open(GAME_TOPICS_FILE, 'r', encoding='utf-8') as f:
        GAME_TOPICS = json.load(f)
    logger.info(f'成功載入遊戲主題和關鍵詞資料庫: {list(GAME_TOPICS.keys())}')
except FileNotFoundError:
    logger.error(f'找不到遊戲主題檔案: {GAME_TOPICS_FILE}')
    GAME_TOPICS = {}
except json.JSONDecodeError as e:
    logger.error(f'解析遊戲主題檔案失敗: {e}')
    GAME_TOPICS = {}


@app.route('/')
def index():
    """遊戲主頁面"""
    return render_template('index.html')


def allowed_file(filename):
    """檢查檔案副檔名是否允許"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/debug/rooms')
def debug_rooms():
    """調試：顯示所有房間狀態"""
    try:
        logger.info(f'調試請求: 檢查房間狀態')
        logger.info(f'GameManager 實例: {game_manager}')
        logger.info(f'GameManager rooms 屬性: {hasattr(game_manager, "rooms")}')

        if hasattr(game_manager, 'rooms'):
            logger.info(f'Rooms 字典: {game_manager.rooms}')
            logger.info(f'Rooms 字典類型: {type(game_manager.rooms)}')
            logger.info(f'Rooms 字典長度: {len(game_manager.rooms)}')

        rooms_info = []
        for room_id, room in game_manager.rooms.items():
            rooms_info.append({
                'room_id': room_id,
                'phaseName': room.phaseName[room.phase],
                'phase': room.phase,
                'player_count': len(room.players),
                'players': [p.name for p in room.players],
                'created_at': room.created_at.isoformat(),
                'topic': getattr(room, 'topic', None),
                'keyword': getattr(room, 'keyword', None)
            })

        response = {
            'total_rooms': len(rooms_info),
            'rooms': rooms_info,
            'game_manager_type': str(type(game_manager)),
            'rooms_dict_keys': list(game_manager.rooms.keys()) if hasattr(game_manager, 'rooms') else 'No rooms attribute'
        }

        logger.info(f'調試回應: {response}')
        return jsonify(response)

    except Exception as e:
        logger.error(f'調試端點錯誤: {e}', exc_info=True)
        return jsonify({
            'error': str(e),
            'total_rooms': 0,
            'rooms': []
        })


@app.errorhandler(404)
def not_found(error):
    """404 錯誤處理"""
    return render_template('index.html'), 404


@app.errorhandler(500)
def internal_error(error):
    """500 錯誤處理"""
    logger.error(f"Internal server error: {error}")
    return render_template('index.html'), 500


#  添加錯誤處理器來處理 SocketIO 連接錯誤
@socketio.on_error_default
def default_error_handler(e):
    """處理 SocketIO 預設錯誤"""
    logger.error(f'SocketIO 錯誤: {e}', exc_info=True)


@socketio.on('connect')
def handle_connect():
    """處理客戶端連接"""
    logger.info(f'客戶端已連接: {request.sid}')
    try:
        emit('connected', {'message': '成功連接到伺服器'})
    except Exception as e:
        logger.error(f'連接處理錯誤: {e}')


@socketio.on('disconnect')
def handle_disconnect():
    """處理玩家離線"""
    logger.info(f'客戶端已斷線: {request.sid}')

    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')
        sid = request.sid  # 先存起來，避免背景 thread 用 request

        if room_id and player_id:
            room = game_manager.get_room(room_id)
            if room:
                player = room.get_player(player_id)
                if player:
                    player_name = player.name

                    def delayed_remove():
                        try:
                            socketio.sleep(5)
                            current_room = game_manager.get_room(room_id)
                            if current_room:
                                current_player = current_room.get_player(
                                    player_id)
                                if current_player and current_player.socket_id == sid:
                                    current_room.remove_player(player_id)

                                    logger.info(
                                        f'玩家離開房間: {player_name} from {room_id}'
                                    )

                                    socketio.emit('player_left', {
                                        'player_name': player_name,
                                        'players': [p.to_dict() for p in current_room.players]
                                    }, room=room_id)

                                    if len(current_room.players) == 0:
                                        game_manager.remove_room(room_id)
                                        logger.info(f'房間已刪除: {room_id}')
                        except Exception as e:
                            logger.error(f'延遲移除玩家錯誤: {e}')

                    socketio.start_background_task(delayed_remove)

    except Exception as e:
        logger.error(f'處理斷線錯誤: {e}')


@socketio.on('create_room')
def handle_create_room(data):
    """建立遊戲房間"""
    try:
        player_name = data.get('player_name', '匿名玩家').strip()

        logger.info(f'收到建立房間請求: player_name={player_name}')
        logger.info(f'請求數據: {data}')

        # 驗證玩家名稱
        if not player_name or len(player_name) > 12:
            logger.warning(f'玩家名稱驗證失敗: {player_name}')
            emit('error', {'message': '玩家名稱長度需在1-12個字元之間'})
            return

        # 生成房間ID
        room_id = str(uuid.uuid4())[:8].upper()
        logger.info(f'生成房間ID: {room_id}')

        # 建立玩家
        player = Player(request.sid, player_name, is_host=True)
        logger.info(f'建立玩家: {player.to_dict()}')

        # 建立房間
        room = Room(room_id, player)
        logger.info(
            f'建立房間物件: room_id={room.id}, player_count={len(room.players)}')

        # 添加房間到管理器
        logger.info(f'添加房間前，管理器中的房間數: {len(game_manager.rooms)}')
        game_manager.add_room(room)
        logger.info(f'添加房間後，管理器中的房間數: {len(game_manager.rooms)}')
        logger.info(f'管理器中的房間列表: {list(game_manager.rooms.keys())}')

        # 加入房間
        join_room(room_id)
        session['room_id'] = room_id
        session['player_id'] = player.id

        logger.info(f'房間建立成功: {room_id} by {player_name}')
        logger.info(
            f'Session設定: room_id={session.get("room_id")}, player_id={session.get("player_id")}')

        # 驗證房間是否真的被添加了
        test_room = game_manager.get_room(room_id)
        logger.info(f'驗證房間是否存在: {test_room is not None}')
        if test_room:
            logger.info(
                f'房間詳細信息: players={len(test_room.players)}, phase={test_room.phase}')

        emit('room_created', {
            'room_id': room_id,
            'player': player.to_dict()
        })

    except Exception as e:
        logger.error(f'建立房間錯誤: {e}', exc_info=True)
        emit('error', {'message': f'建立房間失敗: {str(e)}'})


@socketio.on('join_room')
def handle_join_room(data):
    """加入遊戲房間"""
    try:
        room_id = data.get('room_id', '').strip().upper()
        player_name = data.get('player_name', '').strip()

        logger.info(f'嘗試加入房間: room_id={room_id}, player_name={player_name}')
        logger.info(f'當前所有房間: {list(game_manager.rooms.keys())}')

        # 驗證輸入
        if not room_id or len(room_id) != 8:
            emit('error', {'message': '請輸入正確的房間代碼'})
            return

        if not player_name or len(player_name) > 12:
            emit('error', {'message': '玩家名稱長度需在1-12個字元之間'})
            return

        room = game_manager.get_room(room_id)
        logger.info(f'找到房間: {room is not None}')

        if not room:
            emit('error', {'message': f'房間 {room_id} 不存在或已關閉'})
            return

        if len(room.players) >= 8:
            emit('error', {'message': '房間已滿（最多8人）'})
            return

        # 檢查名稱是否重複
        if any(p.name == player_name for p in room.players):
            emit('error', {'message': '房間內已有相同名稱的玩家'})
            return

        # 檢查遊戲是否已開始
        if room.phaseName[room.phase] != 'waiting':  # 0 代表等待階段
            emit('error', {'message': '遊戲已開始，無法加入'})
            return

        # 建立玩家並加入房間
        player = Player(request.sid, player_name)
        room.add_player(player)

        # 加入房間
        join_room(room_id)
        session['room_id'] = room_id
        session['player_id'] = player.id

        logger.info(f'玩家成功加入房間: {player_name} -> {room_id}')

        # 先回應加入成功的玩家
        emit('join_room_success', {
            'room_id': room_id,
            'player': player.to_dict(),
            'players': [p.to_dict() for p in room.players]
        })

        # 再通知房間內所有玩家（包括新加入的）
        socketio.emit('player_joined', {
            'player': player.to_dict(),
            'players': [p.to_dict() for p in room.players]
        }, room=room_id)

        logger.info(f'已通知房間內所有玩家新玩家加入')

    except Exception as e:
        logger.error(f'加入房間錯誤: {e}', exc_info=True)
        emit('error', {'message': '加入房間失敗，請重試'})


@socketio.on('change_avatar')
def handle_change_avatar(data):
    """更換玩家頭像"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')
        avatar_id = data.get('avatar_id')

        if not room_id or not player_id:
            emit('error', {'message': '請先加入房間'})
            return

        if not isinstance(avatar_id, int) or avatar_id < 1 or avatar_id > 12:
            emit('error', {'message': '無效的頭像ID'})
            return

        room = game_manager.get_room(room_id)
        if room:
            player = room.get_player(player_id)
            if player:
                player.avatar_id = avatar_id
                logger.info(f'頭像更換: {player.name} -> {avatar_id}')

                socketio.emit('avatar_changed', {
                    'player_id': player_id,
                    'avatar_id': avatar_id
                }, room=room_id)

    except Exception as e:
        logger.error(f'更換頭像錯誤: {e}')
        emit('error', {'message': '更換頭像失敗'})


@socketio.on('start_game')
def handle_start_game(data=None):
    """開始遊戲"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')

        if not room_id or not player_id:
            emit('error', {'message': '請先加入房間'})
            return

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在'})
            return

        player = room.get_player(player_id)
        if not player or not player.is_host:
            emit('error', {'message': '只有房主可以開始遊戲'})
            return

        # 隨機選擇主題和關鍵詞
        if GAME_TOPICS:
            topic = random.choice(list(GAME_TOPICS.keys()))
            keyword = random.choice(GAME_TOPICS[topic]["keywords"])
        else:
            topic = "default_topic"
            keyword = "default_keyword"

        # 開始遊戲
        room.start_game(topic, keyword)

        room.phase += 2  # 跳過顯示階段

        logger.info(
            f'遊戲開始: {room_id}, 主題: {topic}, 關鍵詞: {keyword}, 玩家數: {len(room.players)}')

        # 發送遊戲開始訊息給所有玩家
        for game_player in room.players:
            if game_player.is_spy:
                socketio.emit('game_started', {
                    'topic': topic,
                    'keyword': None,  # 內鬼看不到關鍵詞
                    'is_spy': True,
                    'round': 1
                }, room=game_player.socket_id)
                logger.info(f'內鬼: {game_player.name}')
            else:
                socketio.emit('game_started', {
                    'topic': topic,
                    'keyword': keyword,
                    'is_spy': False,
                    'round': 1
                }, room=game_player.socket_id)
        # debug直接跳到投票階段
        # socketio.emit('start_voting_spy', {
        #     'room_id': room_id,
        #     'round': room.current_round,
        #     'players': [p.to_dict() for p in room.players]
        # }, room=room_id)

    except Exception as e:
        logger.error(f'開始遊戲錯誤: {e}')
        emit('error', {'message': '開始遊戲失敗，請重試'})


@socketio.on('submit_drawing_prompt')
def handle_submit_drawing_prompt(data):
    """提交繪圖提詞"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')
        prompt = data.get('prompt', '').strip()

        room = game_manager.get_room(room_id)
        if not room or room.phaseName[room.phase] != 'drawing':
            emit('error', {'message': '當前無法提交提詞'})
            return

        player = room.get_player(player_id)
        if not player:
            emit('error', {'message': '玩家不存在'})
            return

        # 檢查是否已經提交過這輪的提詞
        current_round = room.current_round
        if player.submitted_data and player.submitted_data[-1].round == current_round:
            emit('error', {'message': '您已經提交過這輪的提詞了'})
            return

        logger.info(f'開始繪圖: {player.name} (第{current_round}輪) - {prompt}')

        # 通知開始繪圖
        emit('drawing_started', {'message': 'AI 正在為您繪圖，請稍候...'})

        player.submitted_data.append(SubmittedData(current_round, prompt))

        # 使用 ComfyUI API 生成圖像
        try:
            api = ComfyApiWrapper(app.config['COMFY_API'])
            wf = ComfyWorkflowWrapper("flux_devTW_checkpoint_example.json")
            wf.set_node_param("Deep Translator Text Node",
                              "text", prompt)
            wf.set_node_param("style", "value", "")
            wf.set_node_param("player_id", "value", player_id)
            wf.set_node_param("room_id", "value", room_id)
            wf.set_node_param("round", "value", current_round)
            wf.set_node_param("KSampler", "seed", secrets.randbelow(2**64))
            results = api.queue_prompt(wf)
            logger.info(f'繪圖結果: {results}')
        except Exception as e:
            logger.error(f'繪圖錯誤: {e}', exc_info=True)
            emit('drawing_error', {'message': f'繪圖失敗：請重試'})
    except Exception as e:
        logger.error(f'提交繪圖提詞錯誤: {e}')
        emit('error', {'message': '提交失敗，請重試'})


@app.route('/upload', methods=['POST'])
def upload_images():
    try:
        print(request.headers)
        # 檢查是否有檔案在請求中
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'message': '沒有找到檔案，請使用 "files" 作為檔案欄位名稱'
            }), 400

        files = request.files.getlist('files')

        # 檢查是否有選擇檔案
        if not files or all(file.filename == '' for file in files):
            return jsonify({
                'success': False,
                'message': '沒有選擇檔案'
            }), 400
        room_id = request.headers.get('room', 'no_room')
        player_id = request.headers.get('player', 'no_player')
        round_number = request.headers.get('round', 'no_round')
        room = game_manager.get_room(room_id)

        player = room.get_player(player_id)
        if not player:
            emit('error', {'message': '玩家不存在'})
            return
        last_submitted_data = player.submitted_data[-1]
        assert str(last_submitted_data.round) == str(
            round_number), "提交的回合數與當前回合數不一致"
        fileNo = 0
        for file in files:
            if file.filename == '':
                continue
            try:
                # original_filename = file.filename
                # # 產生唯一檔案名稱（加上時間戳記和UUID）
                # file_extension = original_filename.rsplit('.', 1)[1].lower()
                # new_filename = os.path.join(
                #     room_id, round_number, f"{player}_{fileNo}.{file_extension}")

                # # 檢查 roomId 資料夾是否存在，若不存在則建立
                # room_folder = os.path.join(app.config['UPLOAD_FOLDER'], room_id)
                # if not os.path.exists(room_folder):
                #     os.makedirs(room_folder)
                # # 檢查 round 資料夾是否存在，若不存在則建立
                # round_folder = os.path.join(room_folder, round_number)
                # if not os.path.exists(round_folder):
                #     os.makedirs(round_folder)
                # # 儲存檔案
                # file_path = os.path.join(
                #     app.config['UPLOAD_FOLDER'], new_filename)
                # file.save(file_path)
                # fileNo += 1  # Increment file number for unique filenames
                file_data = base64.b64encode(file.read()).decode('utf-8')
                last_submitted_data.image_data.append(file_data)
                fileNo += 1
            except Exception as e:
                logger.info(f'檔案上傳失敗: , 錯誤: {str(e)}')
        logger.info(f'檔案上傳成功: {fileNo} 個檔案已上傳')
        # 根據成功比例決定 HTTP 狀態碼
        if fileNo < len(files):
            return jsonify({
                'success': False,
                'message': '部分檔案未成功上傳'
            }), 400
        elif fileNo == len(files):
            last_submitted_data.isDrawFinished = True
            allDrawFinish = room.check_all_drawing_finished(int(round_number))
            if allDrawFinish:
                socketio.emit('drawing_finished', {
                    'room_id': room_id,
                    'round': round_number,
                    'players': [p.to_dict() for p in room.players]
                }, room=room_id)
            return jsonify({
                'success': True,
                'message': '所有檔案上傳成功'
            }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'上傳失敗: {str(e)}'
        }), 500


@socketio.on('get_myArt')
def handle_get_myArt(data):
    """獲取玩家的繪圖"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')

        if not room_id or not player_id:
            emit('error', {'message': '請先加入房間'})
            return

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在'})
            return

        player = room.get_player(player_id)
        if not player:
            emit('error', {'message': '玩家不存在'})
            return
        last_submit = player.submitted_data[-1]

        # 返回最新的繪圖資料
        emit('my_art', {
            'round': last_submit.round,
            'image_data': last_submit.image_data,
        })

    except Exception as e:
        logger.error(f'獲取繪圖錯誤: {e}')
        emit('error', {'message': '獲取繪圖失敗，請重試'})


@socketio.on('art_received')
def handle_art_received(data):
    """處理玩家接收繪圖"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')

        if not room_id or not player_id:
            emit('error', {'message': '請先加入房間'})
            return

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在'})
            return

        player = room.get_player(player_id)
        if not player:
            emit('error', {'message': '玩家不存在'})
            return

        # 確認繪圖已經完成
        player.submitted_data[-1].isReceived = True
        all_received = room.check_all_art_received(room.current_round)
        if all_received:
            room.now_showing = 0
            room.phase += 1
            room.generate_show_art_order()
            socketio.emit('start_showing', {
                'room_id': room_id,
                'round': room.current_round,
                'show_art_order': room.show_art_order,
                'now_showing': room.now_showing,
                'show_time': room.gameConfig.SHOW_ART_TIME_LIMIT,
                'players': [p.to_dict() for p in room.players]
            }, room=room_id)
    except Exception as e:
        logger.error(f'處理繪圖接收錯誤: {e}')
        emit('error', {'message': '處理繪圖接收失敗，請重試'})


@socketio.on('selected_art')
def handle_selected_art(data):
    """處理玩家選擇繪圖"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')
        selected_art_no = data.get('selected_art_no')

        if not room_id or not player_id:
            emit('error', {'message': '請先加入房間'})
            return

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在'})
            return

        player = room.get_player(player_id)
        if not player:
            emit('error', {'message': '玩家不存在'})
            return

        # 記錄選擇
        submit = player.submitted_data[-1]
        player.submitted_data[-1].selectedImage = selected_art_no
        logger.info(f'{player.name} 選擇了第 {selected_art_no} 張圖')

        # 首次發送已選擇的繪圖
        socketio.emit(
            'art_selected',
            {
                'room_id': room_id,
                'player_id': player_id,
                'selected_art': submit.image_data[selected_art_no],
                'show_time': room.gameConfig.SHOW_ART_TIME_LIMIT,
                'players': [p.to_dict() for p in room.players]
            },
            room=room_id
        )

        # 背景延遲任務：經過 show_time 秒後執行回調
        socketio.start_background_task(
            target=_delayed_next_turn,
            room_id=room_id,
            delay=room.gameConfig.SHOW_ART_TIME_LIMIT,
        )
    except Exception as e:
        logger.error(f'處理選擇繪圖錯誤: {e}')
        emit('error', {'message': '處理選擇繪圖失敗，請重試'})


def _delayed_next_turn(room_id, delay):
    """背景任務：延遲後觸發下一個玩家選圖"""
    socketio.sleep(delay)
    call_next_player_selectArt(room_id)


def call_next_player_selectArt(room_id):
    """通知下一位玩家選擇繪圖"""
    room = game_manager.get_room(room_id)
    if not room:
        logger.error(f'房間 {room_id} 不存在，無法通知下一位玩家')
        return
    if room.now_showing < len(room.show_art_order) - 1:
        room.now_showing += 1
        socketio.emit('start_showing', {
            'room_id': room_id,
            'round': room.current_round,
            'show_art_order': room.show_art_order,
            'now_showing': room.now_showing,
            'show_time': room.gameConfig.SHOW_ART_TIME_LIMIT,
            'players': [p.to_dict() for p in room.players]
        }, room=room_id)
    else:
        if room.phaseName[room.phase+1] == 'drawing':
            room.current_round += 1
            room.phase += 1
            socketio.emit('write_drawing_prompt', {
                'room_id': room_id,
                'round': room.current_round,
            }, room=room_id)
        elif room.phaseName[room.phase+1] == 'voting':
            room.phase += 1
            socketio.emit('start_voting_spy', {
                'room_id': room_id,
                'round': room.current_round,
                'players': [p.to_dict() for p in room.players]
            }, room=room_id)


@socketio.on('submit_spy_vote')
def handle_submit_vote(data):
    """提交投票"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')
        voted_player_id = data.get('voted_player_id')

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在'})
            return

        if player_id in room.votes:
            emit('error', {'message': '您已經投過票了'})
            return

        voted_player = room.get_player(voted_player_id)
        if not voted_player:
            emit('error', {'message': '被投票的玩家不存在'})
            return

        room.votes[player_id] = voted_player_id

        voter = room.get_player(player_id)
        logger.info(f'投票: {voter.name} -> {voted_player.name}')

        # 檢查是否所有玩家都投票完成
        if len(room.votes) == len(room.players):
            # 統計投票結果
            vote_counts = {}
            for voted_id in room.votes.values():
                vote_counts[voted_id] = vote_counts.get(voted_id, 0) + 1

            # 找出得票最多的玩家
            most_voted_player_id = max(vote_counts, key=vote_counts.get)
            most_voted_player = room.get_player(most_voted_player_id)

            logger.info(
                f'投票結果: {most_voted_player.name} 得票最多 ({vote_counts[most_voted_player_id]}票)')

            real_spy = next(p for p in room.players if p.is_spy)
            real_spy_id = real_spy.id
            room.phase += 1
            # 給內鬼顯示猜測選項
            correct_keyword = room.keyword
            similar_options = [
                kw for kw in GAME_TOPICS[room.topic]["keywords"] if kw != correct_keyword]
            options = random.sample(similar_options, min(
                15, len(similar_options)))  # 選取最多15個關鍵詞
            options.append(correct_keyword)
            random.shuffle(options)

            # 檢查是否投中內鬼
            if most_voted_player_id == real_spy_id:
                room.guess_spy_correct = True
                logger.info(f'投中內鬼: {most_voted_player.name}')
            else:
                room.guess_spy_correct = False
                logger.info(f'沒投中內鬼: {real_spy.name}')
            socketio.emit('voting_spy_result', {
                'most_voted_player': most_voted_player_id,
                'spy_is': real_spy_id,
                'guess_spy_correct': room.guess_spy_correct,
                'vote_counts': vote_counts,
                'spy_options': options
            }, room=room_id)
    except Exception as e:
        logger.error(f'投票錯誤: {e}')
        emit('error', {'message': '投票失敗，請重試'})


@socketio.on('spy_guess')
def handle_spy_guess(data):
    """內鬼猜測關鍵詞"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')
        guessed_keyword = data.get('guessed_keyword', '').strip()

        room = game_manager.get_room(room_id)

        player = room.get_player(player_id)

        logger.info(
            f'內鬼猜測: {player.name} 猜測「{guessed_keyword}」(正確答案: 「{room.keyword}」)')
        winType = None
        # 檢查猜測結果
        if guessed_keyword == room.keyword:
            # 內鬼獲勝
            if room.guess_spy_correct:
                winType = 'spyComeback'
                logger.info(f'內鬼逆轉勝: {player.name} 猜對了關鍵詞')
            else:
                winType = 'spyBigWin'
                logger.info(f'內鬼大獲全勝: {player.name} 猜對了關鍵詞')
        else:
            # 平民獲勝
            winType = 'commonVictory'
            logger.info(f'平民獲勝: {player.name} 猜錯了關鍵詞')

        # 打包每個玩家的繪圖資料
        gallery_data = [
            {
                'player_name': p.name,
                'gallery_data': [data.pack_for_gallery() for data in p.submitted_data]
            }
            for p in room.players
        ]

        logger.info(f'遊戲結束，打包畫廊資料')

        # 發送畫廊資料給所有玩家
        socketio.emit('game_ended', {
            'winType': winType,
            'correctAnswer': room.keyword,
            'spyGuess': guessed_keyword,
            'gallery': gallery_data
        }, room=room_id)
        room.phase += 1

    except Exception as e:
        logger.error(f'猜測錯誤: {e}')
        emit('error', {'message': '猜測失敗，請重試'})


@socketio.on('ping')
def handle_ping(data=None):
    """心跳檢測"""
    emit('pong')


@socketio.on('rejoin_room')
def handle_rejoin_room(data):
    """重新加入房間（用於頁面跳轉後重新連接）"""
    try:
        room_id = data.get('room_id')
        player_id = data.get('player_id')

        logger.info(f'嘗試重新加入房間: room_id={room_id}, player_id={player_id}')

        if not room_id or not player_id:
            emit('error', {'message': '缺少房間或玩家資訊'})
            return

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在或已關閉'})
            return

        player = room.get_player(player_id)
        if not player:
            emit('error', {'message': '玩家不在此房間中'})
            return

        # 更新玩家的 socket ID
        player.socket_id = request.sid

        # 重新加入房間
        join_room(room_id)
        session['room_id'] = room_id
        session['player_id'] = player_id

        logger.info(f'玩家重新連接成功: {player.name} -> {room_id}')

        # 發送房間當前狀態
        emit('room_rejoined', {
            'room_id': room_id,
            'player': player.to_dict(),
            'players': [p.to_dict() for p in room.players],
            'phase': room.phase,
            'current_round': getattr(room, 'current_round', 1)
        })

        # 如果遊戲已經開始，發送遊戲狀態
        if room.phase == 'drawing' and hasattr(room, 'topic'):
            if player.is_spy:
                emit('game_started', {
                    'topic': room.topic,
                    'keyword': None,
                    'is_spy': True,
                    'round': room.current_round
                })
            else:
                emit('game_started', {
                    'topic': room.topic,
                    'keyword': room.keyword,
                    'is_spy': False,
                    'round': room.current_round
                })

    except Exception as e:
        logger.error(f'重新加入房間錯誤: {e}', exc_info=True)


@socketio.on('get_room_info')
def handle_get_room_info(data=None):
    """獲取房間資訊"""
    try:
        room_id = session.get('room_id')
        if not room_id:
            emit('error', {'message': '未加入任何房間'})
            return

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在'})
            return

        emit('room_info', {
            'room_id': room.id,
            'phase': room.phase,
            'players': [p.to_dict() for p in room.players],
            'current_round': room.current_round
        })

    except Exception as e:
        logger.error(f'獲取房間資訊錯誤: {e}')
        emit('error', {'message': '獲取房間資訊失敗'})


@socketio.on('leave_room')
def handle_leave_room(data=None):
    """玩家離開房間"""
    try:
        room_id = session.get('room_id')
        player_id = session.get('player_id')

        if not room_id or not player_id:
            emit('error', {'message': '未在任何房間中'})
            return

        room = game_manager.get_room(room_id)
        if not room:
            emit('error', {'message': '房間不存在'})
            return

        player = room.get_player(player_id)
        if not player:
            emit('error', {'message': '玩家不在此房間中'})
            return

        player_name = player.name
        sid = request.sid

        current_room = game_manager.get_room(room_id)
        if current_room:
            current_player = current_room.get_player(player_id)
            if current_player and current_player.socket_id == sid:
                current_room.remove_player(player_id)

                logger.info(
                    f'玩家主動離開房間: {player_name} from {room_id}'
                )
                leave_room(room_id)
                socketio.emit('player_left', {
                    'player_name': player_name,
                    'players': [p.to_dict() for p in current_room.players]
                }, room=room_id)

                if len(current_room.players) == 0:
                    game_manager.remove_room(room_id)
                    logger.info(f'房間已刪除: {room_id}')

                # 清除 session
                session.pop('room_id', None)
                session.pop('player_id', None)

    except Exception as e:
        logger.error(f'離開房間錯誤: {e}', exc_info=True)
        emit('error', {'message': '離開房間失敗'})


# 定期清理空房間和過期房間
def cleanup_rooms():
    """定期清理房間"""
    while True:
        try:
            time.sleep(600)  # 每10分鐘清理一次
            old_count = game_manager.get_room_count()
            game_manager.cleanup_empty_rooms()
            game_manager.cleanup_old_rooms(max_age_hours=4)  # 清理4小時以上的房間
            new_count = game_manager.get_room_count()
            if old_count != new_count:
                logger.info(
                    f'房間清理完成，清理了 {old_count - new_count} 個房間，當前房間數: {new_count}')
        except Exception as e:
            logger.error(f'房間清理錯誤: {e}')


# 啟動清理線程
cleanup_thread = threading.Thread(target=cleanup_rooms, daemon=True)
cleanup_thread.start()


#  添加健康檢查端點
@app.route('/health')
def health_check():
    """健康檢查端點"""
    return jsonify({
        'status': 'healthy',
        'rooms': len(game_manager.rooms),
        'timestamp': datetime.now().isoformat()
    })


if __name__ == '__main__':
    logger.info('伺服器啟動中...')
    logger.info(f'ComfyUI 客戶端類型: {type(comfy_client).__name__}')

    #  添加更好的啟動配置
    try:
        socketio.run(
            app,
            debug=True,  # 在生產環境中關閉 debug
            host='0.0.0.0',
            port=5000,
            log_output=True,
            allow_unsafe_werkzeug=True
        )
    except Exception as e:
        logger.error(f'伺服器啟動失敗: {e}', exc_info=True)
