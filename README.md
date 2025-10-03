<p align="center">
    <img src="/README/logo.webp" style="width: 30%;">
    <br/>
</p>

# AI亂畫害我輸 - 一款讓AI亂畫的遊戲


與朋友一同在線上遊玩，<br />
使用生成式AI繪圖模型，<br />
一步步找出藏在你們之中的間諜!

**注意! AI可不會照你的指示乖乖畫出你想要的圖片**

## 介面截圖

* 首頁
<p align="center">
    <img src="/README/screenshot/home.webp" style="width: 100%;">
    <br/>
</p>

* 遊戲房間
<p align="center">
    <img src="/README/screenshot/room.webp" style="width: 100%;">
    <br/>
</p>

* 主題投票
<p align="center">
    <img src="/README/screenshot/topicVote.webp" style="width: 100%;">
    <br/>
</p>

* 繪圖指令輸入
<p align="center">
    <img src="/README/screenshot/textInput.webp" style="width: 100%;">
    <br/>
</p>

* 繪圖結果選擇
<p align="center">
    <img src="/README/screenshot/chooseShowing.webp" style="width: 100%;">
    <br/>
</p>

* 繪圖結果展示
<p align="center">
    <img src="/README/screenshot/showing.webp" style="width: 100%;">
    <br/>
</p>

* 投票選出間諜
<p align="center">
    <img src="/README/screenshot/spyVote.webp" style="width: 100%;">
    <br/>
</p>

* 間諜票數展示
<p align="center">
    <img src="/README/screenshot/spyVoteCount.webp" style="width: 100%;">
    <br/>
</p>

* 間諜猜測關鍵字
<p align="center">
    <img src="/README/screenshot/spyGuess.webp" style="width: 100%;">
    <br/>
</p>

* 遊戲結束藝廊展示
<p align="center">
    <img src="/README/screenshot/gallery.webp" style="width: 100%;">
    <br/>
</p>


## 玩法
1. 「AI亂畫害我輸」是一款結合了創意繪畫和社交推理的多人遊戲。
<p align="center">
    <img src="/README/rule/friends.webp" style="width: 30%;">
    <br/>
</p>

2. 每輪遊戲中，系統會隨機選出一名玩家作為間諜，其他玩家為畫家。
<p align="center">
    <img src="/README/rule/artist.webp" style="width: 30%;">
    <img src="/README/rule/pigSpy.webp" style="width: 20%;">
</p>

3. <p>所有玩家會選出一個共同的主題，然而關鍵字只有畫家看的到，間諜無法得知。</p><p>間諜必須通過觀察其他玩家的繪畫來猜測關鍵字。</p>
<p align="center">
    <img src="/README/rule/keyWord.webp" style="width: 50%;">
    <br/>
</p>

4. 所有玩家根據主題繪製數張圖畫。
<p align="center">
    <img src="/README/rule/art.webp" style="width: 30%;">
    <br/>
</p>

5. 繪畫完成後，將展示一張選擇的作品。
<p align="center">
    <img src="/README/rule/showArt.webp" style="width: 30%;">
    <br/>
</p>

6. 兩輪繪畫後，將投票選出最可疑的玩家。
<p align="center">
    <img src="/README/rule/vote.webp" style="width: 30%;">
    <br/>
</p>

7. 投票結束後，系統會揭曉間諜身份。
<p align="center">
    <img src="/README/rule/pigSpy.webp" style="width: 30%;">
    <br/>
</p>

8. <p>如果間諜被識破，其他玩家暫時獲勝。</p><p>如果間諜未被識破，則間諜獲得勝利。</p>

9. 接著，間諜將有一次機會猜出關鍵字
    - **若間諜猜中關鍵字，且已被識破** → **間諜逆轉勝**  
    - **若間諜猜中關鍵字，且未被識破** → **間諜大獲全勝**  
    **因此，絕對不能讓間諜猜到關鍵字！**


## 操作提示
* 滑鼠移到玩家繪製的圖片可以放大
* 在藝廊時，滑鼠移到玩家繪製的圖片可以看到當時的指令及候補圖片
## 系統需求
* 依照你使用的AI模型，可能需要24GB以上之GPU
* 需要自行架設ComfyUI，並開啟API功能


## TODO
* 改善遊戲平衡
* 新的遊戲模式
* 更可靠的系統

