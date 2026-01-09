// 游戏配置
const GRID_SIZE = 20;  // 网格大小 20x20
const CELL_SIZE = 20;  // 单元格大小
const MOVE_INTERVAL = 150; // AI移动间隔(ms)

// 游戏状态
let snake = [];        // 蛇身体 [{x,y}, ...]
let food = { x: 0, y: 0 };  // 食物位置
let direction = 'right'; // 当前方向
let nextDirection = 'right'; // 下一个方向
let score = 0;
let aiInterval = null;
let gameRunning = false;

// DOM元素
const gameEl = document.getElementById('game');
const startAIEl = document.getElementById('startAI');
const stopAIEl = document.getElementById('stopAI');
const resetEl = document.getElementById('reset');
const statusEl = document.getElementById('status');

// 初始化游戏
function initGame() {
    // 重置蛇：初始位置在中间偏左
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    gameRunning = true;
    generateFood();
    renderGrid();
    updateStatus();
}

// 生成食物（不在蛇身体上）
function generateFood() {
    let valid = false;
    while (!valid) {
        food.x = Math.floor(Math.random() * GRID_SIZE);
        food.y = Math.floor(Math.random() * GRID_SIZE);
        // 检查是否在蛇身上
        valid = !snake.some(seg => seg.x === food.x && seg.y === food.y);
    }
}

// 渲染网格
function renderGrid() {
    gameEl.innerHTML = '';
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'empty';

            // 判断是蛇身体还是食物
            if (snake.some(seg => seg.x === x && seg.y === y)) {
                cell.className = 'snake';
            } else if (x === food.x && y === food.y) {
                cell.className = 'food';
            }
            gameEl.appendChild(cell);
        }
    }
}

// 移动蛇
function moveSnake() {
    if (!gameRunning) return;

    // 更新方向
    direction = nextDirection;
    // 计算新蛇头
    const head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y -= 1; break;
        case 'down': head.y += 1; break;
        case 'left': head.x -= 1; break;
        case 'right': head.x += 1; break;
    }

    // 碰撞检测：边界或自身
    if (
        head.x < 0 || head.x >= GRID_SIZE ||
        head.y < 0 || head.y >= GRID_SIZE ||
        snake.some(seg => seg.x === head.x && seg.y === head.y)
    ) {
        gameOver();
        return;
    }

    // 添加新蛇头
    snake.unshift(head);

    // 判断是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        generateFood();
    } else {
        // 没吃到就移除尾巴
        snake.pop();
    }

    renderGrid();
    updateStatus();
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    stopAI();
    statusEl.textContent = `状态：游戏结束 | 得分：${score}`;
    alert(`游戏结束！得分：${score}`);
}

// 更新状态显示
function updateStatus() {
    const aiStatus = aiInterval ? 'AI运行中' : '未运行';
    statusEl.textContent = `状态：${aiStatus} | 得分：${score}`;
}

// ==================== AI核心逻辑 ====================
// AI决策方向：贪心算法，优先向食物方向移动
function aiDecideDirection() {
    if (!gameRunning) return;

    const head = snake[0];
    const possibleDirs = ['up', 'down', 'left', 'right'];
    const validDirs = [];

    // 筛选有效方向：不撞边界、不撞自身
    for (const dir of possibleDirs) {
        const testHead = { ...head };
        switch (dir) {
            case 'up': testHead.y -= 1; break;
            case 'down': testHead.y += 1; break;
            case 'left': testHead.x -= 1; break;
            case 'right': testHead.x += 1; break;
        }
        // 检查是否有效
        if (
            testHead.x >= 0 && testHead.x < GRID_SIZE &&
            testHead.y >= 0 && testHead.y < GRID_SIZE &&
            !snake.some(seg => seg.x === testHead.x && seg.y === testHead.y)
        ) {
            validDirs.push(dir);
        }
    }

    if (validDirs.length === 0) return;

    // 贪心策略：选择离食物最近的方向（曼哈顿距离）
    let bestDir = validDirs[0];
    let minDist = Infinity;

    for (const dir of validDirs) {
        const testHead = { ...head };
        switch (dir) {
            case 'up': testHead.y -= 1; break;
            case 'down': testHead.y += 1; break;
            case 'left': testHead.x -= 1; break;
            case 'right': testHead.x += 1; break;
        }
        // 计算曼哈顿距离
        const dist = Math.abs(testHead.x - food.x) + Math.abs(testHead.y - food.y);
        if (dist < minDist) {
            minDist = dist;
            bestDir = dir;
        }
    }

    // 更新方向（不能直接掉头）
    const oppositeDir = {
        'up': 'down', 'down': 'up',
        'left': 'right', 'right': 'left'
    };
    if (bestDir !== oppositeDir[direction]) {
        nextDirection = bestDir;
    }
}

// AI自动移动
function aiMove() {
    aiDecideDirection();
    moveSnake();
}

// 启动AI
function startAI() {
    if (aiInterval || !gameRunning) return;
    aiInterval = setInterval(aiMove, MOVE_INTERVAL);
    updateStatus();
}

// 停止AI
function stopAI() {
    if (!aiInterval) return;
    clearInterval(aiInterval);
    aiInterval = null;
    updateStatus();
}

// 事件监听
startAIEl.addEventListener('click', startAI);
stopAIEl.addEventListener('click', stopAI);
resetEl.addEventListener('click', () => {
    stopAI();
    initGame();
});

// 初始化
initGame();