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
    statusEl.textContent = `状态：${aiStatus} | 得分：${score} | 蛇长：${snake.length}`;
}

// ==================== 优化后的智能AI核心逻辑 ====================

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
 * BFS寻找从起点到终点的最短路径
 * @param {Object} start - 起点 {x,y}
 * @param {Object} end - 终点 {x,y}
 * @returns {Array|null} 路径数组（包含方向），找不到返回null
 */
function bfsFindPath(start, end) {
    // 复制当前蛇身（排除尾巴，因为移动后尾巴会消失）
    const tempSnake = [...snake];
    tempSnake.pop(); // 模拟移动后的蛇身，避免误判

    const queue = [{ pos: start, path: [] }];
    const visited = new Set([`${start.x},${start.y}`]);

    const directions = [
        { dir: 'up', x: 0, y: -1 },
        { dir: 'down', x: 0, y: 1 },
        { dir: 'left', x: -1, y: 0 },
        { dir: 'right', x: 1, y: 0 }
    ];

    while (queue.length > 0) {
        const { pos, path } = queue.shift();

        // 到达终点，返回路径
        if (pos.x === end.x && pos.y === end.y) {
            return path;
        }

        // 探索四个方向
        for (const dir of directions) {
            const nextPos = {
                x: pos.x + dir.x,
                y: pos.y + dir.y
            };
            const key = `${nextPos.x},${nextPos.y}`;

            // 检查是否有效：边界内、不在蛇身、未访问过
            if (
                nextPos.x >= 0 && nextPos.x < GRID_SIZE &&
                nextPos.y >= 0 && nextPos.y < GRID_SIZE &&
                !tempSnake.some(seg => seg.x === nextPos.x && seg.y === nextPos.y) &&
                !visited.has(key)
            ) {
                visited.add(key);
                queue.push({
                    pos: nextPos,
                    path: [...path, dir.dir]
                });
            }
        }
    }

    return null; // 没有找到路径
}

/**
 * 检查位置是否有逃生空间（避免死胡同）
 * @param {Object} pos - 要检查的位置
 * @returns {boolean} 是否有足够的逃生空间
 */
function hasEscapeRoute(pos) {
    const tempSnake = [...snake];
    tempSnake.pop(); // 模拟移动后的蛇身

    // 计算可移动的方向数
    let escapeRoutes = 0;
    const directions = [
        { x: 0, y: -1 }, // up
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 }   // right
    ];

    for (const dir of directions) {
        const testPos = {
            x: pos.x + dir.x,
            y: pos.y + dir.y
        };

        if (
            testPos.x >= 0 && testPos.x < GRID_SIZE &&
            testPos.y >= 0 && testPos.y < GRID_SIZE &&
            !tempSnake.some(seg => seg.x === testPos.x && seg.y === testPos.y)
        ) {
            escapeRoutes++;
        }
    }

    // 蛇越长，需要的逃生路径越多
    const minEscapeRoutes = snake.length > GRID_SIZE * 2 ? 2 : 1;
    return escapeRoutes >= minEscapeRoutes;
}

/**
 * 智能AI决策方向：路径规划 + 生存优先
 */
function aiDecideDirection() {
    if (!gameRunning) return;

    const head = snake[0];
    const oppositeDir = {
        'up': 'down', 'down': 'up',
        'left': 'right', 'right': 'left'
    };

    // 1. 先用BFS找去食物的最短路径
    const pathToFood = bfsFindPath(head, food);

    // 2. 收集所有有效方向（基础过滤）
    const possibleDirs = ['up', 'down', 'left', 'right'];
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

        // 检查位置有效性
        const isPositionValid = (
            testHead.x >= 0 && testHead.x < GRID_SIZE &&
            testHead.y >= 0 && testHead.y < GRID_SIZE &&
            !snake.some(seg => seg.x === testHead.x && seg.y === testHead.y)
        );

        if (isPositionValid) {
            // 计算该方向的评分
            validDirs.push({
                dir: dir,
                pos: testHead,
                foodDist: manhattanDistance(testHead, food),
                hasEscape: hasEscapeRoute(testHead),
                isPathDir: pathToFood && pathToFood[0] === dir // 是否是最短路径的第一步
            });
        }
    }

    if (validDirs.length === 0) return;

    // 3. 智能排序策略（优先级从高到低）
    validDirs.sort((a, b) => {
        // 优先级1：有逃生路径（生存第一）
        if (a.hasEscape !== b.hasEscape) {
            return a.hasEscape ? -1 : 1;
        }

        // 优先级2：是最短路径方向（优先吃食物）
        if (a.isPathDir !== b.isPathDir) {
            return a.isPathDir ? -1 : 1;
        }

        // 优先级3：离食物更近（贪心兜底）
        return a.foodDist - b.foodDist;
    });

    // 4. 选择最优方向
    nextDirection = validDirs[0].dir;
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