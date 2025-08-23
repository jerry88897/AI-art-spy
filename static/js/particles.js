// 粒子背景系統
class ParticleSystem {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.particles = [];
        this.maxParticles = 50;
        this.animationId = null;
        this.isActive = false;
        
        if (!this.container) {
            console.warn('粒子容器不存在');
            return;
        }
        
        this.init();
    }

    init() {
        // 檢查是否支援動畫
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.maxParticles = 10; // 減少粒子數量
        }
        
        // 檢查設備性能
        const deviceInfo = GameUtils?.getDeviceInfo() || { isMobile: false };
        if (deviceInfo.isMobile) {
            this.maxParticles = 20; // 手機設備減少粒子數量
        }
        
        this.createParticles();
        this.startAnimation();
    }

    createParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.createParticle();
        }
    }

    createParticle() {
        const particle = {
            element: document.createElement('div'),
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 4 + 2,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.1,
            life: Math.random() * 1000 + 500,
            maxLife: Math.random() * 1000 + 500,
            color: this.getRandomColor()
        };

        particle.element.className = 'particle';
        particle.element.style.cssText = `
            position: absolute;
            width: ${particle.size}px;
            height: ${particle.size}px;
            background: ${particle.color};
            border-radius: 50%;
            pointer-events: none;
            opacity: ${particle.opacity};
            left: ${particle.x}px;
            top: ${particle.y}px;
            transition: opacity 0.3s ease;
        `;

        this.container.appendChild(particle.element);
        this.particles.push(particle);
        
        return particle;
    }

    getRandomColor() {
        const colors = [
            'rgba(99, 102, 241, 0.1)',   // 主要藍色
            'rgba(139, 92, 246, 0.1)',   // 紫色
            'rgba(245, 158, 11, 0.1)',   // 橙色
            'rgba(59, 130, 246, 0.1)',   // 淺藍色
            'rgba(16, 185, 129, 0.1)',   // 綠色
            'rgba(239, 68, 68, 0.1)'     // 紅色
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateParticle(particle) {
        // 更新位置
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // 邊界檢查和反彈
        if (particle.x <= 0 || particle.x >= window.innerWidth) {
            particle.speedX *= -1;
            particle.x = Math.max(0, Math.min(window.innerWidth, particle.x));
        }
        if (particle.y <= 0 || particle.y >= window.innerHeight) {
            particle.speedY *= -1;
            particle.y = Math.max(0, Math.min(window.innerHeight, particle.y));
        }

        // 更新生命週期
        particle.life -= 16; // 假設60FPS，每幀約16ms
        
        // 根據生命週期調整透明度
        const lifeRatio = particle.life / particle.maxLife;
        if (lifeRatio < 0.2) {
            particle.opacity = lifeRatio * 5 * (Math.random() * 0.5 + 0.1);
        }

        // 應用變化到DOM
        particle.element.style.left = particle.x + 'px';
        particle.element.style.top = particle.y + 'px';
        particle.element.style.opacity = particle.opacity;

        // 檢查是否需要重生
        if (particle.life <= 0) {
            this.respawnParticle(particle);
        }
    }

    respawnParticle(particle) {
        particle.x = Math.random() * window.innerWidth;
        particle.y = Math.random() * window.innerHeight;
        particle.size = Math.random() * 4 + 2;
        particle.speedX = (Math.random() - 0.5) * 0.5;
        particle.speedY = (Math.random() - 0.5) * 0.5;
        particle.opacity = Math.random() * 0.5 + 0.1;
        particle.life = Math.random() * 1000 + 500;
        particle.maxLife = particle.life;
        particle.color = this.getRandomColor();

        particle.element.style.cssText = `
            position: absolute;
            width: ${particle.size}px;
            height: ${particle.size}px;
            background: ${particle.color};
            border-radius: 50%;
            pointer-events: none;
            opacity: ${particle.opacity};
            left: ${particle.x}px;
            top: ${particle.y}px;
            transition: opacity 0.3s ease;
        `;
    }

    animate() {
        if (!this.isActive) return;

        this.particles.forEach(particle => {
            this.updateParticle(particle);
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    startAnimation() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.animate();
    }

    stopAnimation() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // 鼠標互動效果
    addMouseInteraction() {
        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // 讓附近的粒子產生反應
            this.particles.forEach(particle => {
                const dx = mouseX - particle.x;
                const dy = mouseY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    const force = (100 - distance) / 100;
                    particle.speedX += (dx / distance) * force * 0.02;
                    particle.speedY += (dy / distance) * force * 0.02;
                    particle.opacity = Math.min(1, particle.opacity + force * 0.1);
                }
            });
        };

        const handleMouseLeave = () => {
            // 重置粒子狀態
            this.particles.forEach(particle => {
                particle.speedX *= 0.9;
                particle.speedY *= 0.9;
            });
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }

    // 響應窗口大小變化
    handleResize() {
        const resizeHandler = () => {
            // 重新定位超出邊界的粒子
            this.particles.forEach(particle => {
                if (particle.x > window.innerWidth) {
                    particle.x = window.innerWidth - 10;
                }
                if (particle.y > window.innerHeight) {
                    particle.y = window.innerHeight - 10;
                }
            });
        };

        window.addEventListener('resize', resizeHandler);
        return () => window.removeEventListener('resize', resizeHandler);
    }

    // 清理資源
    destroy() {
        this.stopAnimation();
        
        // 移除所有粒子元素
        this.particles.forEach(particle => {
            if (particle.element.parentNode) {
                particle.element.parentNode.removeChild(particle.element);
            }
        });
        
        this.particles = [];
    }

    // 動態調整粒子數量
    setParticleCount(count) {
        const currentCount = this.particles.length;
        
        if (count > currentCount) {
            // 增加粒子
            for (let i = 0; i < count - currentCount; i++) {
                this.createParticle();
            }
        } else if (count < currentCount) {
            // 減少粒子
            const toRemove = this.particles.splice(count);
            toRemove.forEach(particle => {
                if (particle.element.parentNode) {
                    particle.element.parentNode.removeChild(particle.element);
                }
            });
        }
        
        this.maxParticles = count;
    }

    // 改變粒子主題色彩
    setTheme(theme) {
        const themes = {
            default: [
                'rgba(99, 102, 241, 0.1)',
                'rgba(139, 92, 246, 0.1)',
                'rgba(245, 158, 11, 0.1)',
                'rgba(59, 130, 246, 0.1)',
                'rgba(16, 185, 129, 0.1)',
                'rgba(239, 68, 68, 0.1)'
            ],
            gaming: [
                'rgba(255, 0, 150, 0.1)',
                'rgba(0, 255, 255, 0.1)',
                'rgba(255, 255, 0, 0.1)',
                'rgba(255, 128, 0, 0.1)'
            ],
            victory: [
                'rgba(255, 215, 0, 0.2)',
                'rgba(255, 165, 0, 0.2)',
                'rgba(255, 140, 0, 0.2)'
            ],
            defeat: [
                'rgba(128, 128, 128, 0.1)',
                'rgba(64, 64, 64, 0.1)',
                'rgba(192, 192, 192, 0.1)'
            ]
        };

        const colors = themes[theme] || themes.default;
        
        this.particles.forEach(particle => {
            particle.color = colors[Math.floor(Math.random() * colors.length)];
            particle.element.style.background = particle.color;
        });
    }
}

// 創建全域粒子系統實例
window.particleSystem = null;

// 初始化函數
function initParticles() {
    // 檢查是否已經初始化
    if (window.particleSystem) return;

    // 檢查是否有粒子容器
    const container = document.getElementById('particles-background');
    if (!container) return;

    try {
        window.particleSystem = new ParticleSystem('particles-background');
        
        // 添加鼠標互動（桌面設備）
        if (!GameUtils?.getDeviceInfo()?.isMobile) {
            window.particleSystem.addMouseInteraction();
        }
        
        // 添加響應式處理
        window.particleSystem.handleResize();
        
        console.log('粒子系統初始化完成');
    } catch (error) {
        console.warn('粒子系統初始化失敗:', error);
    }
}

// 清理粒子系統
function destroyParticles() {
    if (window.particleSystem) {
        window.particleSystem.destroy();
        window.particleSystem = null;
    }
}

// 控制函數
window.setParticleTheme = (theme) => {
    if (window.particleSystem) {
        window.particleSystem.setTheme(theme);
    }
};

window.setParticleCount = (count) => {
    if (window.particleSystem) {
        window.particleSystem.setParticleCount(count);
    }
};

// 頁面可見性變化時暫停/恢復動畫
document.addEventListener('visibilitychange', () => {
    if (window.particleSystem) {
        if (document.hidden) {
            window.particleSystem.stopAnimation();
        } else {
            window.particleSystem.startAnimation();
        }
    }
});

// 頁面卸載時清理
window.addEventListener('beforeunload', destroyParticles);

// 輸出初始化函數
window.initParticles = initParticles;
window.destroyParticles = destroyParticles;