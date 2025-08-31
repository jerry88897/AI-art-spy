import random
from datetime import datetime
from typing import List, Dict, Optional
import uuid


class Player:
    """玩家類別"""

    def __init__(self, socket_id: str, name: str, is_host: bool = False):
        self.id = str(uuid.uuid4())
        self.socket_id = socket_id
        self.name = name
        self.is_host = is_host
        self.is_spy = False
        self.avatar_id = random.randint(0, 31)  # 預設隨機頭像
        self.connected = True
        self.topic_voted = False  # 玩家投票
        self.submitted_data = []
        # debug
        # self.submitted_data.append(SubmittedData(round=1, prompt="一隻豬"))
        # self.submitted_data.append(SubmittedData(round=1, prompt="一隻豬"))

    def to_dict(self):
        """轉換為字典格式"""
        return {
            'id': self.id,
            'name': self.name,
            'is_host': self.is_host,
            # 'is_spy': self.is_spy,
            'avatar_id': self.avatar_id,
            'connected': self.connected
        }


class SubmittedData:
    """玩家提交的數據類別"""

    def __init__(self, round: int, prompt: str):
        self.round = round
        self.prompt = prompt
        self.isDrawFinished = False  # 繪圖是否完成
        self.image_data = []  # 圖片數據
        self.isReceived = False  # 是否已接收
        self.selectedImage = None  # 用於選擇的圖片ID
        # debug
        # self.round = 1
        # self.prompt = "一隻豬"
        # self.isDrawFinished = True  # 繪圖是否完成
        # self.image_data = []  # 圖片數據
        # with open('.temp/image.txt', 'r', encoding='utf-8') as file:
        #     self.image_data = [line.strip() for line in file]
        # self.isReceived = True  # 是否已接收
        # self.selectedImage = 0  # 用於選擇的圖片ID

    def to_dict(self):
        """轉換為字典格式"""
        return {
            'round': self.round,
            'prompt': self.prompt,
            'isDrawFinished': self.isDrawFinished,
            'image_data': self.image_data,
            'isReceived': self.isReceived,
            'selectedImage': self.selectedImage
        }

    def pack_for_gallery(self):
        """轉換為字典格式"""
        return {
            'round': self.round,
            'prompt': self.prompt,
            'image_data': self.image_data,
            'selectedImage': self.selectedImage
        }


class Room:
    """遊戲房間類別"""

    def __init__(self, room_id: str, host_player: Player):
        self.id = room_id
        self.gameConfig = GameConfig()  # 遊戲配置
        self.players: List[Player] = [host_player]
        self.phaseName = ['waiting', 'voting_topic', 'show_topic', 'drawing',
                          'show_art', 'drawing', 'show_art', 'voting', 'spy_guess', 'ended']  # 階段數組
        self.phase = 0  # 'waiting', 'voting_topic', 'show_topic', 'drawing', 'show_art','drawing', 'show_art', 'voting', 'spy_guess', 'ended'
        self.wait_time = {
            'drawing': 120,  # 繪圖時間限制
            'picking': 30,   # 選擇主題時間限制
            'showing': 10,  # 展示時間限制
            'voting': 60,    # 投票時間限制
            'spy_guess': 30  # 間諜猜測時間限制
        }
        self.created_at = datetime.now()
        self.topicCandidates = []
        self.topicVoteCount = []
        self.topic = '電玩遊戲'
        self.keyword = 'Minecraft'
        self.current_round = 1
        self.max_rounds = 2
        self.show_art_order = []  # 繪圖展示順序
        self.now_showing = 0  # 當前展示的玩家ID
        self.timer = None  # 用於計時的定時器
        self.guess_spy_correct = False  # 間諜猜測是否正確

        self.votes: Dict[str, str] = {}  # 玩家投票

    def add_player(self, player: Player):
        """添加玩家到房間"""
        if len(self.players) < 8:
            self.players.append(player)
            return True
        return False

    def remove_player(self, player_id: str):
        """從房間移除玩家"""
        self.players = [p for p in self.players if p.id != player_id]

        # 如果房主離開，指派新房主
        if not any(p.is_host for p in self.players) and self.players:
            self.players[0].is_host = True

    def get_player(self, player_id: str) -> Optional[Player]:
        """根據ID獲取玩家"""
        for player in self.players:
            if player.id == player_id:
                return player
        return None

    def get_player_by_socket(self, socket_id: str) -> Optional[Player]:
        """根據socket ID獲取玩家"""
        for player in self.players:
            if player.socket_id == socket_id:
                return player
        return None

    def start_game(self, topic: str, keyword: str):
        """開始遊戲"""
        self.topic = topic
        self.keyword = keyword
        self.phase = 1
        self.current_round = 1

        # 隨機選擇一名玩家作為間諜
        spy_index = random.randint(0, len(self.players) - 1)
        spy_index = 0
        for i, player in enumerate(self.players):
            player.is_spy = (i == spy_index)

    def check_all_drawing_finished(self, round: int):
        """處理玩家繪圖完成"""
        # 檢查每位玩家在指定回合是否有完成繪圖的提交
        all_finished = True
        for player in self.players:
            # 找出該玩家在本回合的所有提交資料
            round_data = [
                data for data in player.submitted_data if data.round == round]
            # 判斷是否有任何一筆資料已完成繪圖
            has_finished = any(data.isDrawFinished for data in round_data)
            if not has_finished:
                all_finished = False
                break  # 有玩家未完成則直接跳出
        if all_finished:
            print(f"所有玩家在第 {round} 輪繪圖已完成，進入展示階段。")
            return True
        else:
            print(f"第 {round} 輪繪圖尚未完成，等待其他玩家。")
            return False

    def check_all_get_art(self, round: int):
        """檢查所有玩家是否已獲得繪圖"""
        all_received = True
        for player in self.players:
            # 找出該玩家在本回合的所有提交資料
            round_data = [
                data for data in player.submitted_data if data.round == round]
            # 判斷是否有任何一筆資料已接收
            has_received = any(data.isReceived for data in round_data)
            if not has_received:
                all_received = False
                break
        if all_received:
            return True
        else:
            return False

    def check_all_art_received(self, round: int):
        """檢查所有玩家是否已接收繪圖"""
        all_received = True
        for player in self.players:
            # 找出該玩家在本回合的所有提交資料
            round_data = [
                data for data in player.submitted_data if data.round == round]
            # 判斷是否有任何一筆資料已接收
            has_received = any(data.isReceived for data in round_data)
            if not has_received:
                all_received = False
                break
        return all_received

    def generate_show_art_order(self):
        """生成繪圖展示順序"""
        self.now_showing = 0
        self.show_art_order = random.sample(
            [player.id for player in self.players], len(self.players))

    def start_second_round(self):
        """開始第二輪繪圖"""
        self.current_round = 2

    def start_voting(self):
        """開始投票階段"""
        self.phase = 'voting'

    def get_all_drawings(self):
        """獲取所有繪圖作品"""
        all_drawings = []
        for round_num in sorted(self.drawings.keys()):
            for player_id, drawing_data in self.drawings[round_num].items():
                all_drawings.append({
                    'round': round_num,
                    'player_id': player_id,
                    'player_name': drawing_data['player_name'],
                    'prompt': drawing_data['prompt'],
                    'image_data': drawing_data['image_data']
                })
        return all_drawings

    def get_spy(self) -> Optional[Player]:
        """獲取間諜玩家"""
        for player in self.players:
            if player.is_spy:
                return player
        return None


class GameManager:
    """遊戲管理器"""

    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def add_room(self, room: Room):
        """添加房間"""
        self.rooms[room.id] = room

    def get_room(self, room_id: str) -> Optional[Room]:
        """獲取房間"""
        return self.rooms.get(room_id)

    def remove_room(self, room_id: str):
        """移除房間"""
        if room_id in self.rooms:
            del self.rooms[room_id]

    def get_room_count(self) -> int:
        """獲取房間總數"""
        return len(self.rooms)

    def get_active_rooms(self) -> List[Dict]:
        """獲取活躍房間列表"""
        active_rooms = []
        for room in self.rooms.values():
            if room.phase != 'ended':
                active_rooms.append({
                    'id': room.id,
                    'player_count': len(room.players),
                    'max_players': 8,
                    'phase': room.phase,
                    'created_at': room.created_at.isoformat()
                })
        return active_rooms

    def cleanup_empty_rooms(self):
        """清理空房間"""
        empty_rooms = [room_id for room_id,
                       room in self.rooms.items() if len(room.players) == 0]
        for room_id in empty_rooms:
            del self.rooms[room_id]

    def cleanup_old_rooms(self, max_age_hours: int = 24):
        """清理過舊的房間"""
        current_time = datetime.now()
        old_rooms = []

        for room_id, room in self.rooms.items():
            age_hours = (current_time - room.created_at).total_seconds() / 3600
            if age_hours > max_age_hours:
                old_rooms.append(room_id)

        for room_id in old_rooms:
            del self.rooms[room_id]

# 遊戲配置


class GameConfig:
    """遊戲配置類別"""
    MIN_PLAYERS = 3
    MAX_PLAYERS = 8
    DRAWING_ROUNDS = 2
    SHOW_ART_TIME_LIMIT = 3
    VOTING_TIME_LIMIT = 60  # 秒
    DRAWING_TIME_LIMIT = 120  # 秒
    SPY_GUESS_TIME_LIMIT = 30  # 秒
    GAME_STAGES = ['waiting', 'voting_topic', 'show_topic', 'drawing', 'show_art',
                   'drawing', 'show_art', 'voting', 'spy_guess', 'ended']

    # 頭像配置
    AVATAR_COUNT = 12

    # 提詞限制
    MAX_PROMPT_LENGTH = 100
    MIN_PROMPT_LENGTH = 5

# 遊戲統計


class GameStats:
    """遊戲統計類別"""

    def __init__(self):
        self.total_games = 0
        self.spy_wins = 0
        self.citizen_wins = 0
        self.total_players = 0
        self.popular_topics = {}

    def record_game_end(self, winner: str, topic: str, player_count: int):
        """記錄遊戲結束"""
        self.total_games += 1
        self.total_players += player_count

        if winner == 'spy':
            self.spy_wins += 1
        else:
            self.citizen_wins += 1

        if topic in self.popular_topics:
            self.popular_topics[topic] += 1
        else:
            self.popular_topics[topic] = 1

    def get_stats(self):
        """獲取統計資訊"""
        return {
            'total_games': self.total_games,
            'spy_win_rate': self.spy_wins / max(self.total_games, 1) * 100,
            'citizen_win_rate': self.citizen_wins / max(self.total_games, 1) * 100,
            'average_players': self.total_players / max(self.total_games, 1),
            'popular_topics': sorted(self.popular_topics.items(), key=lambda x: x[1], reverse=True)
        }


# 全域統計實例
game_stats = GameStats()
