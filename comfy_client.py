import json
import requests
import uuid
import logging
import asyncio
import websockets
import base64
from requests.auth import HTTPBasicAuth
from requests.compat import urljoin
import os
import time
from typing import Optional, Dict, Any
import io
from PIL import Image

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ComfyUIClient:
    """ComfyUI API 客戶端類別"""
    
    def __init__(self, 
                 server_url: str = "http://127.0.0.1:8188",
                 workflow_path: str = "flux_devTW_checkpoint_example.json",
                 user: str = "",
                 password: str = ""):
        """
        初始化 ComfyUI 客戶端
        
        Args:
            server_url: ComfyUI 伺服器地址
            workflow_path: 工作流程檔案路徑
            user: 使用者名稱（如需認證）
            password: 密碼（如需認證）
        """
        self.server_url = server_url
        self.workflow_path = workflow_path
        self.auth = None
        
        if user:
            self.auth = HTTPBasicAuth(user, password)
        
        # 設定 WebSocket URL
        url_without_protocol = server_url.split("//")[-1]
        ws_protocol = "wss" if "https" in server_url else "ws"
        
        if user:
            self.ws_url_base = f"{ws_protocol}://{user}:{password}@{url_without_protocol}"
        else:
            self.ws_url_base = f"{ws_protocol}://{url_without_protocol}"
        
        # 載入工作流程範本
        self.workflow_template = self.load_workflow_template()
    
    def load_workflow_template(self) -> Dict[str, Any]:
        """載入工作流程範本"""
        try:
            with open(self.workflow_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"工作流程檔案不存在: {self.workflow_path}")
            # 返回基本的工作流程範本
            return self.get_default_workflow()
        except json.JSONDecodeError:
            logger.error(f"工作流程檔案格式錯誤: {self.workflow_path}")
            return self.get_default_workflow()
    
    def get_default_workflow(self) -> Dict[str, Any]:
        """獲取預設工作流程"""
        return {
            "1": {
                "inputs": {
                    "text": "人跟熊握手，寫實",
                    "clip": ["11", 0]
                },
                "class_type": "CLIPTextEncode"
            },
            "3": {
                "inputs": {
                    "seed": 42,
                    "steps": 20,
                    "cfg": 7.0,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["10", 0],
                    "positive": ["1", 0],
                    "negative": ["6", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "5": {
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": "text, watermark, low quality",
                    "clip": ["11", 0]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["12", 0]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            },
            "10": {
                "inputs": {
                    "ckpt_name": "flux_dev.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "11": {
                "inputs": {
                    "ckpt_name": "flux_dev.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "12": {
                "inputs": {
                    "ckpt_name": "flux_dev.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            }
        }
    
    def generate_image(self, prompt: str, negative_prompt: str = "text, watermark, low quality", 
                      width: int = 512, height: int = 512, steps: int = 20, cfg: float = 7.0) -> str:
        """
        生成圖像
        
        Args:
            prompt: 正面提示詞
            negative_prompt: 負面提示詞
            width: 圖像寬度
            height: 圖像高度
            steps: 採樣步數
            cfg: CFG 尺度
            
        Returns:
            str: Base64編碼的圖像資料
            
        Raises:
            Exception: 當生成失敗時拋出異常
        """
        try:
            # 複製工作流程範本
            workflow = self.workflow_template.copy()
            
            # 更新參數
            self.update_workflow_params(workflow, prompt, negative_prompt, width, height, steps, cfg)
            
            # 生成隨機種子
            seed = int(time.time() * 1000) % 1000000
            if "3" in workflow and "inputs" in workflow["3"]:
                workflow["3"]["inputs"]["seed"] = seed
            
            # 提交工作流程並等待結果
            client_id = str(uuid.uuid4())
            prompt_id = self.queue_prompt(workflow, client_id)
            
            # 等待完成並獲取圖像
            image_data = asyncio.run(self.wait_for_completion(prompt_id, client_id))
            
            return image_data
            
        except Exception as e:
            logger.error(f"圖像生成失敗: {str(e)}")
            raise Exception(f"圖像生成失敗: {str(e)}")
    
    def update_workflow_params(self, workflow: Dict[str, Any], prompt: str, negative_prompt: str,
                             width: int, height: int, steps: int, cfg: float):
        """更新工作流程參數"""
        # 更新正面提示詞
        if "1" in workflow and "inputs" in workflow["1"]:
            workflow["1"]["inputs"]["text"] = prompt
        
        # 更新負面提示詞
        if "6" in workflow and "inputs" in workflow["6"]:
            workflow["6"]["inputs"]["text"] = negative_prompt
        
        # 更新圖像尺寸
        if "5" in workflow and "inputs" in workflow["5"]:
            workflow["5"]["inputs"]["width"] = width
            workflow["5"]["inputs"]["height"] = height
        
        # 更新採樣參數
        if "3" in workflow and "inputs" in workflow["3"]:
            workflow["3"]["inputs"]["steps"] = steps
            workflow["3"]["inputs"]["cfg"] = cfg
    
    def queue_prompt(self, workflow: Dict[str, Any], client_id: str) -> str:
        """提交工作流程到佇列"""
        prompt_data = {
            "prompt": workflow,
            "client_id": client_id
        }
        
        url = urljoin(self.server_url, "/prompt")
        response = requests.post(url, json=prompt_data, auth=self.auth)
        
        if response.status_code == 200:
            result = response.json()
            return result["prompt_id"]
        else:
            raise Exception(f"提交工作流程失敗: {response.status_code} - {response.text}")
    
    async def wait_for_completion(self, prompt_id: str, client_id: str) -> str:
        """等待工作流程完成並獲取結果"""
        ws_url = f"{self.ws_url_base}/ws?clientId={client_id}"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    
                    if data["type"] == "execution_error":
                        if data["data"]["prompt_id"] == prompt_id:
                            raise Exception(f"執行錯誤: {data['data']}")
                    
                    elif data["type"] == "executing":
                        if data["data"]["node"] is None and data["data"]["prompt_id"] == prompt_id:
                            # 工作流程完成，獲取圖像
                            return await self.get_generated_image(prompt_id)
                    
                    elif data["type"] == "status":
                        status = data["data"]["status"]
                        if status["exec_info"]["queue_remaining"] == 0:
                            continue
                            
        except Exception as e:
            logger.error(f"WebSocket 連接錯誤: {str(e)}")
            raise Exception(f"等待完成時發生錯誤: {str(e)}")
    
    async def get_generated_image(self, prompt_id: str) -> str:
        """獲取生成的圖像"""
        # 獲取歷史記錄
        history_url = urljoin(self.server_url, f"/history/{prompt_id}")
        response = requests.get(history_url, auth=self.auth)
        
        if response.status_code != 200:
            raise Exception(f"獲取歷史記錄失敗: {response.status_code}")
        
        history = response.json()
        
        # 找到輸出圖像
        if prompt_id not in history:
            raise Exception("在歷史記錄中找不到該提示")
        
        outputs = history[prompt_id].get("outputs", {})
        
        # 尋找保存圖像的節點（通常是 SaveImage 節點）
        image_info = None
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                image_info = node_output["images"][0]
                break
        
        if not image_info:
            raise Exception("在輸出中找不到圖像")
        
        # 下載圖像
        image_url = urljoin(self.server_url, f"/view?filename={image_info['filename']}&subfolder={image_info.get('subfolder', '')}&type={image_info.get('type', 'output')}")
        image_response = requests.get(image_url, auth=self.auth)
        
        if image_response.status_code != 200:
            raise Exception(f"下載圖像失敗: {image_response.status_code}")
        
        # 轉換為 Base64
        image_base64 = base64.b64encode(image_response.content).decode('utf-8')
        return f"data:image/png;base64,{image_base64}"
    
    def test_connection(self) -> bool:
        """測試與 ComfyUI 伺服器的連接"""
        try:
            url = urljoin(self.server_url, "/queue")
            response = requests.get(url, auth=self.auth, timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"連接測試失敗: {str(e)}")
            return False
    
    def get_queue_status(self) -> Dict[str, Any]:
        """獲取佇列狀態"""
        try:
            url = urljoin(self.server_url, "/queue")
            response = requests.get(url, auth=self.auth)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"獲取佇列狀態失敗: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"獲取佇列狀態錯誤: {str(e)}")
            return {"error": str(e)}
    
    def upload_image(self, image_path: str, subfolder: str = "default_upload_folder") -> Dict[str, Any]:
        """上傳圖像到 ComfyUI 伺服器"""
        try:
            url = urljoin(self.server_url, "/upload/image")
            
            with open(image_path, 'rb') as f:
                files = {"image": (os.path.basename(image_path), f, "image/png")}
                data = {"subfolder": subfolder}
                
                response = requests.post(url, files=files, data=data, auth=self.auth)
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"上傳圖像失敗: {response.status_code} - {response.text}")
                    
        except Exception as e:
            logger.error(f"上傳圖像錯誤: {str(e)}")
            raise Exception(f"上傳圖像失敗: {str(e)}")

class MockComfyUIClient:
    """模擬 ComfyUI 客戶端（用於測試）"""
    
    def __init__(self):
        self.mock_responses = [
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAC+gGAFZsJnAAAAABJRU5ErkJggg=="
        ]
        self.current_index = 0
    
    def generate_image(self, prompt: str, **kwargs) -> str:
        """模擬圖像生成"""
        import time
        time.sleep(2)  # 模擬生成時間
        
        # 循環返回模擬圖像
        response = self.mock_responses[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.mock_responses)
        
        return response
    
    def test_connection(self) -> bool:
        """模擬連接測試"""
        return True
    
    def get_queue_status(self) -> Dict[str, Any]:
        """模擬佇列狀態"""
        return {
            "queue_running": [],
            "queue_pending": []
        }