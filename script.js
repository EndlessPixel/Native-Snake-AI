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
    // 设置游戏容器样式
    gameEl.style.display = 'grid';
    gameEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
    gameEl.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
    gameEl.style.gap = '1px';
    gameEl.style.width = `${GRID_SIZE * CELL_SIZE + GRID_SIZE - 1}px`;

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'empty';
            cell.style.width = `${CELL_SIZE}px`;
            cell.style.height = `${CELL_SIZE}px`;
            cell.style.backgroundColor = '#f0f0f000';

            // 判断是蛇身体还是食物
            if (snake.some(seg => seg.x === x && seg.y === y)) {
                cell.className = 'snake';
                cell.style.backgroundColor = '#2ecc71';
                // 蛇头特殊样式
                if (x === snake[0].x && y === snake[0].y) {
                    cell.style.backgroundColor = '#27ae60';
                }
            } else if (x === food.x && y === food.y) {
                cell.className = 'food';
                cell.style.backgroundColor = '#e74c3c';
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

// ==================== 优化后的AI核心逻辑 ====================

/**
 * 计算两个点之间的曼哈顿距离
 * @param {Object} a - {x,y}
 * @param {Object} b - {x,y}
 * @returns {number} 曼哈顿距离
 */
function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 深度优先搜索(DFS)检查从起点是否可达终点
 * @param {Object} start - 起点 {x,y}
 * @param {Object} end - 终点 {x,y}
 * @param {Set} visited - 已访问的坐标集合
 * @returns {boolean} 是否可达
 */
function isReachable(start, end, visited = new Set()) {
    // 到达终点
    if (start.x === end.x && start.y === end.y) return true;

    // 标记当前位置为已访问
    const key = `${start.x},${start.y}`;
    if (visited.has(key)) return false;
    visited.add(key);

    // 检查是否是有效位置（不在边界外、不是蛇身）
    if (
        start.x < 0 || start.x >= GRID_SIZE ||
        start.y < 0 || start.y >= GRID_SIZE ||
        snake.some(seg => seg.x === start.x && seg.y === start.y)
    ) {
        return false;
    }

    // 向四个方向探索
    const directions = [
        { x: 0, y: -1 }, // up
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 }   // right
    ];

    for (const dir of directions) {
        const next = { x: start.x + dir.x, y: start.y + dir.y };
        if (isReachable(next, end, visited)) {
            return true;
        }
    }

    return false;
}

/**
 * 计算一个位置的安全评分（周围可移动的方向数）
 * @param {Object} pos - {x,y}
 * @returns {number} 安全评分（越高越安全）
 */
function calculateSafetyScore(pos) {
    let score = 0;
    const directions = [
        { x: 0, y: -1 }, // up
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 }   // right
    ];

    for (const dir of directions) {
        const testPos = { x: pos.x + dir.x, y: pos.y + dir.y };
        // 检查位置是否有效且不是蛇身
        if (
            testPos.x >= 0 && testPos.x < GRID_SIZE &&
            testPos.y >= 0 && testPos.y < GRID_SIZE &&
            !snake.some(seg => seg.x === testPos.x && seg.y === testPos.y)
        ) {
            score++;
        }
    }

    return score;
}

// AI决策方向：优化版 - 避免自陷 + 贪心寻食
function aiDecideDirection() {
    if (!gameRunning) return;

    const head = snake[0];
    const possibleDirs = ['up', 'down', 'left', 'right'];
    const oppositeDir = {
        'up': 'down', 'down': 'up',
        'left': 'right', 'right': 'left'
    };

    // 1. 筛选基础有效方向：不撞边界、不撞自身、不直接掉头
    let validDirs = [];
    for (const dir of possibleDirs) {
        // 跳过反方向
        if (dir === oppositeDir[direction]) continue;

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
            validDirs.push({
                dir: dir,
                pos: testHead,
                foodDist: manhattanDistance(testHead, food),
                safety: calculateSafetyScore(testHead),
                reachable: isReachable(testHead, food)
            });
        }
    }

    if (validDirs.length === 0) return;

    // 2. 优先筛选能到达食物的方向（避免走进死胡同）
    const reachableDirs = validDirs.filter(d => d.reachable);
    const candidateDirs = reachableDirs.length > 0 ? reachableDirs : validDirs;

    // 3. 排序策略：
    // - 优先：能到达食物
    // - 其次：离食物更近
    // - 最后：安全评分更高（避免死胡同）
    candidateDirs.sort((a, b) => {
        // 先按距离排序（近的在前）
        if (a.foodDist !== b.foodDist) {
            return a.foodDist - b.foodDist;
        }
        // 距离相同则按安全评分排序（高的在前）
        return b.safety - a.safety;
    });

    // 4. 选择最优方向
    nextDirection = candidateDirs[0].dir;
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