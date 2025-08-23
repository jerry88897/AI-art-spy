// 彩紙特效 JavaScript 版本
// 改編自 https://codepen.io/Pillowfication/pen/PNEJbY
// 原作者：Markus Tran

const random = Math.random;
const cos = Math.cos;
const sin = Math.sin;
const PI = Math.PI;
const PI2 = PI * 2;
const spread = 40;
const sizeMin = 3;
const sizeMax = 12 - sizeMin;
const eccentricity = 10;
const deviation = 100;
const dxThetaMin = -0.1;
const dxThetaMax = -dxThetaMin - dxThetaMin;
const dyMin = 0.13;
const dyMax = 0.18;
const dThetaMin = 0.4;
const dThetaMax = 0.7 - dThetaMin;

let timer;
let frame;
const confetti = [];

// GitHub 主題色彩
const colors = ['#6a737d', '#0366d6', '#28a745', '#ffd33d', '#f66a0a', '#6f42c1', '#ea4aaa'];

function colorTheme() {
  const idx = Math.floor(Math.random() * colors.length);
  return colors[idx] || '#6a737d';
}

// 餘弦插值
function interpolation(a, b, t) {
  return ((1 - cos(PI * t)) / 2) * (b - a) + a;
}

// 創建 1D 最大泊松圓盤在 [0, 1] 區間
const radius = 1 / eccentricity;
const radius2 = radius + radius;

function createPoisson() {
  const domain = [radius, 1 - radius];
  let measure = 1 - radius2;
  const spline = [0, 1];
  
  while (measure) {
    let dart = measure * random();
    let i, l, interval, a, b;

    // 找到 dart 的位置
    for (i = 0, l = domain.length, measure = 0; i < l; i += 2) {
      a = domain[i];
      b = domain[i + 1];
      interval = b - a;
      if (dart < measure + interval) {
        const newDart = dart + a - measure;
        spline.push(newDart);
        dart = newDart;
        break;
      }
      measure += interval;
    }

    const c = dart - radius;
    const d = dart + radius;

    // 更新定義域
    for (i = domain.length - 1; i > 0; i -= 2) {
      l = i - 1;
      a = domain[l];
      b = domain[i];

      if (a >= c && a < d) {
        if (b > d) domain[l] = d;
        else domain.splice(l, 2);
      } else if (a < c && b > c) {
        if (b <= d) domain[i] = c;
        else domain.splice(i, 0, c, d);
      }
    }

    // 重新測量定義域
    for (i = 0, l = domain.length, measure = 0; i < l; i += 2) {
      measure += domain[i + 1] - domain[i];
    }
  }
  return spline.sort();
}

class Confetto {
  constructor(theme) {
    this.frame = 0;
    this.themeFunc = theme;
    this.theta = 360 * random();
    this.axis = `rotate3D(${cos(360 * random())},${cos(360 * random())},0,`;
    this.dTheta = dThetaMin + dThetaMax * random();
    this.dx = sin(dxThetaMin + dxThetaMax * random());
    this.dy = dyMin + dyMax * random();

    // 創建週期性樣條
    this.splineX = createPoisson();
    this.splineY = [];
    const l = this.splineX.length - 1;
    for (let i = 1; i < l; ++i) {
      this.splineY[i] = deviation * random();
    }
    this.splineY[0] = this.splineY[l] = deviation * random();
    
    // 初始化 DOM 元素
    this.initializeDOM();
  }

  initializeDOM() {
    // 創建 DOM 元素
    this.outer = document.createElement('div');
    this.inner = document.createElement('div');
    this.outer.appendChild(this.inner);

    this.x = window.innerWidth * random();
    this.y = -deviation;

    // 設定外層元素樣式
    this.outer.style.position = 'absolute';
    this.outer.style.width = `${sizeMin + sizeMax * random()}px`;
    this.outer.style.height = `${sizeMin + sizeMax * random()}px`;
    this.outer.style.perspective = '50px';
    this.outer.style.transform = `rotate(${360 * random()}deg)`;
    this.outer.style.left = `${this.x}px`;
    this.outer.style.top = `${this.y}px`;
    
    // 設定內層元素樣式
    this.inner.style.width = '100%';
    this.inner.style.height = '100%';
    this.inner.style.backgroundColor = this.themeFunc();
    this.inner.style.transform = `${this.axis}${this.theta}deg)`;
  }

  update(height, delta) {
    this.frame += delta;
    this.x += this.dx * delta;
    this.y += this.dy * delta;
    this.theta += this.dTheta * delta;

    let phi = (this.frame % 7777) / 7777;
    let i = 0;
    let j = 1;
    while (j < this.splineX.length && phi >= (this.splineX[j] || 0)) {
      i = j++;
    }
    const rho = interpolation(
      this.splineY[i] || 0,
      this.splineY[j] || 0,
      (phi - (this.splineX[i] || 0)) / ((this.splineX[j] || 0) - (this.splineX[i] || 0))
    );
    phi *= PI2;

    this.inner.style.transform = `${this.axis}${this.theta}deg)`;
    this.outer.style.left = `${this.x + rho * cos(phi)}px`;
    this.outer.style.top = `${this.y + rho * sin(phi)}px`;
    return this.y > height + deviation;
  }
}

function poof(duration) {
  // 創建總容器
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '0';
  container.style.overflow = 'visible';
  container.style.zIndex = '9999';
  
  // 預設 5 秒
  const ttl = duration == null ? 5000 : duration;

  if (!frame) {
    document.body.appendChild(container);

    const addConfetto = () => {
      const confetto = new Confetto(colorTheme);
      confetti.push(confetto);
      container.appendChild(confetto.outer);
      timer = window.setTimeout(addConfetto, spread * random());
    };
    addConfetto();

    let prev = null;

    const loop = (timestamp) => {
      const delta = prev ? timestamp - prev : 0;
      prev = timestamp;
      const height = window.innerHeight;

      for (let i = confetti.length - 1; i >= 0; --i) {
        const confetto = confetti[i];
        if (confetto && confetto.update(height, delta)) {
          container.removeChild(confetto.outer);
          confetti.splice(i, 1);
        }
      }

      if (timer || confetti.length) {
        frame = requestAnimationFrame(loop);
        return;
      }

      document.body.removeChild(container);
      frame = undefined;
    };

    window.setTimeout(function () {
      clearTimeout(timer);
      timer = undefined;
    }, ttl);

    requestAnimationFrame(loop);
  }
}

// 讓函數可以全域使用
window.poof = poof;