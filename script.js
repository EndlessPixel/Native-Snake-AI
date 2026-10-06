// ---------- 游戏配置 ----------
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const BASE_MOVE_INTERVAL = 80;

let snake = [];
let food = { x: 0, y: 0 };
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let aiInterval = null;
let gameRunning = false;
let gameWinFlag = false;

const gameEl = document.getElementById('game');
const startAIEl = document.getElementById('startAI');
const stopAIEl = document.getElementById('stopAI');
const resetEl = document.getElementById('reset');
const statusEl = document.getElementById('status');

// ============================================================
// ============ 极限优化：贪吃蛇 AI 内核 ============
// ============================================================
const N = GRID_SIZE * GRID_SIZE;

const _occ      = new Uint8Array(N);
const _visited  = new Uint8Array(N);
const _dist     = new Int32Array(N);
const _parent   = new Int32Array(N);
const _queue    = new Int32Array(N);

const _DIRS     = ['up', 'down', 'left', 'right'];
const _OPPOSITE = { up:'down', down:'up', left:'right', right:'left' };
const _DELTA    = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };

const _idx = (x, y) => y * GRID_SIZE + x;

function _buildOcc(snakeArr, startX, startY, ignoreTail) {
    _occ.fill(0);
    for (let i = 0; i < snakeArr.length; i++) {
        _occ[_idx(snakeArr[i].x, snakeArr[i].y)] = 1;
    }
    if (ignoreTail && snakeArr.length > 1) {
        const t = snakeArr[snakeArr.length - 1];
        _occ[_idx(t.x, t.y)] = 0;
    }
    if (startX >= 0) _occ[_idx(startX, startY)] = 0;
}

function _bfsDist(snakeArr, sx, sy, tx, ty, ignoreTail) {
    if (sx === tx && sy === ty) return 0;
    _buildOcc(snakeArr, sx, sy, ignoreTail);
    _dist.fill(-1);
    let qh = 0, qt = 0;
    const sk = _idx(sx, sy), tk = _idx(tx, ty);
    _dist[sk] = 0;
    _queue[qt++] = sk;
    while (qh < qt) {
        const k = _queue[qh++];
        const d = _dist[k];
        if (k === tk) return d;
        const x = k % GRID_SIZE, y = (k - x) / GRID_SIZE;
        const nd = d + 1;
        if (x > 0)             { const nk = k - 1;         if (_dist[nk] === -1 && !_occ[nk]) { _dist[nk] = nd; _queue[qt++] = nk; } }
        if (x < GRID_SIZE - 1) { const nk = k + 1;         if (_dist[nk] === -1 && !_occ[nk]) { _dist[nk] = nd; _queue[qt++] = nk; } }
        if (y > 0)             { const nk = k - GRID_SIZE; if (_dist[nk] === -1 && !_occ[nk]) { _dist[nk] = nd; _queue[qt++] = nk; } }
        if (y < GRID_SIZE - 1) { const nk = k + GRID_SIZE; if (_dist[nk] === -1 && !_occ[nk]) { _dist[nk] = nd; _queue[qt++] = nk; } }
    }
    return Infinity;
}

function _bfsCount(snakeArr, sx, sy, ignoreTail) {
    _buildOcc(snakeArr, sx, sy, ignoreTail);
    _visited.fill(0);
    let qh = 0, qt = 0;
    const sk = _idx(sx, sy);
    _visited[sk] = 1;
    _queue[qt++] = sk;
    let count = 0;
    while (qh < qt) {
        const k = _queue[qh++];
        count++;
        const x = k % GRID_SIZE, y = (k - x) / GRID_SIZE;
        if (x > 0)             { const nk = k - 1;         if (!_visited[nk] && !_occ[nk]) { _visited[nk] = 1; _queue[qt++] = nk; } }
        if (x < GRID_SIZE - 1) { const nk = k + 1;         if (!_visited[nk] && !_occ[nk]) { _visited[nk] = 1; _queue[qt++] = nk; } }
        if (y > 0)             { const nk = k - GRID_SIZE; if (!_visited[nk] && !_occ[nk]) { _visited[nk] = 1; _queue[qt++] = nk; } }
        if (y < GRID_SIZE - 1) { const nk = k + GRID_SIZE; if (!_visited[nk] && !_occ[nk]) { _visited[nk] = 1; _queue[qt++] = nk; } }
    }
    return count;
}

function _evaluateMove(dir) {
    const head = snake[0];
    const [dx, dy] = _DELTA[dir];
    const nx = head.x + dx, ny = head.y + dy;

    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return -Infinity;

    const ateFood = (nx === food.x && ny === food.y);
    const len = snake.length;
    const tailIdx = len - 1;

    for (let i = 0; i < len; i++) {
        if (!ateFood && i === tailIdx) continue;
        if (snake[i].x === nx && snake[i].y === ny) return -Infinity;
    }

    const newLen = ateFood ? len + 1 : len;
    if (newLen >= N) return 1e12;

    const newSnake = new Array(newLen);
    newSnake[0] = { x: nx, y: ny };
    const copyCount = ateFood ? len : len - 1;
    for (let i = 0; i < copyCount; i++) newSnake[i + 1] = snake[i];

    const newTail = newSnake[newLen - 1];
    const canReachTail = isFinite(_bfsDist(newSnake, nx, ny, newTail.x, newTail.y, true));

    if (ateFood) {
        if (canReachTail) return 1e9;
        const space = _bfsCount(newSnake, nx, ny, true);
        return space * 10;
    }

    if (!canReachTail) {
        const space = _bfsCount(newSnake, nx, ny, true);
        return space * 5 - 100000;
    }

    const foodDist = _bfsDist(newSnake, nx, ny, food.x, food.y, true);
    if (!isFinite(foodDist)) {
        const space = _bfsCount(newSnake, nx, ny, true);
        return 10000 + space;
    }

    return 50000 - foodDist * 100;
}

function aiDecideDirection() {
    if (!gameRunning) return;
    const opp = _OPPOSITE[direction];
    let bestDir = null, bestScore = -Infinity;

    for (const dir of _DIRS) {
        if (dir === opp) continue;
        const s = _evaluateMove(dir);
        if (s > bestScore) {
            bestScore = s;
            bestDir = dir;
        }
    }
    if (bestDir) nextDirection = bestDir;
}

// ============================================================
// ============ 游戏逻辑 ============
// ============================================================
function generateFood() {
    if (snake.length >= N) { gameWin(); return; }
    for (let i = 0; i < 1000; i++) {
        const rx = Math.floor(Math.random() * GRID_SIZE);
        const ry = Math.floor(Math.random() * GRID_SIZE);
        if (!snake.some(s => s.x === rx && s.y === ry)) {
            food = { x: rx, y: ry };
            return;
        }
    }
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (!snake.some(s => s.x === x && s.y === y)) {
                food = { x, y };
                return;
            }
        }
    }
    gameWin();
}

function renderGrid() {
    gameEl.innerHTML = '';
    gameEl.style.display = 'grid';
    gameEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
    gameEl.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
    gameEl.style.gap = '1px';
    gameEl.style.width = `${GRID_SIZE * CELL_SIZE + GRID_SIZE - 1}px`;

    const headKey = snake[0] ? `${snake[0].x},${snake[0].y}` : '';
    const bodySet = new Set();
    for (let i = 1; i < snake.length; i++) bodySet.add(`${snake[i].x},${snake[i].y}`);

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.style.width = `${CELL_SIZE}px`;
            cell.style.height = `${CELL_SIZE}px`;
            const key = `${x},${y}`;
            if (key === headKey) cell.className = 'snake-head';
            else if (bodySet.has(key)) cell.className = 'snake';
            else if (x === food.x && y === food.y) cell.className = 'food';
            else cell.className = 'empty';
            gameEl.appendChild(cell);
        }
    }
}

// ★ 修复：引擎与 AI 使用相同的尾巴规则
function moveSnake() {
    if (!gameRunning) return;
    direction = nextDirection;
    const head = { ...snake[0] };
    switch (direction) {
        case 'up':    head.y--; break;
        case 'down':  head.y++; break;
        case 'left':  head.x--; break;
        case 'right': head.x++; break;
    }

    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
    }

    const ate = (head.x === food.x && head.y === food.y);

    const tailIdx = snake.length - 1;
    for (let i = 0; i < snake.length; i++) {
        if (!ate && i === tailIdx) continue;
        if (snake[i].x === head.x && snake[i].y === head.y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);
    if (ate) {
        score += 10;
        generateFood();
        if (!gameRunning) return;
    } else {
        snake.pop();
    }

    renderGrid();
    updateStatus();
    if (snake.length === N && !gameWinFlag) gameWin();
}

function gameOver() {
    if (!gameRunning) return;
    gameRunning = false;
    gameWinFlag = false;
    stopAI();
    statusEl.textContent = `状态：💀 游戏结束 | 得分：${score} | 蛇长：${snake.length}`;
    alert(`游戏结束！最终得分：${score}`);
}

function gameWin() {
    if (!gameRunning) return;
    gameRunning = false;
    gameWinFlag = true;
    stopAI();
    statusEl.textContent = `状态：🏆 胜利！满分通关 | 得分：${score} | 蛇长：${snake.length}`;
    alert(`🎉 恭喜获胜！完美通关！ 得分：${score}`);
}

function updateStatus() {
    const aiStatus = aiInterval ? '🤖 AI运行中' : '⏸️ 未运行';
    statusEl.innerHTML = `状态：${aiStatus} | 得分：${score} | 蛇长：${snake.length}`;
}

function initGame() {
    stopAI();
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    gameRunning = true;
    gameWinFlag = false;
    generateFood();
    renderGrid();
    updateStatus();
}

function aiMove() {
    if (!gameRunning) return;
    aiDecideDirection();
    moveSnake();
}

function startAI() {
    if (!gameRunning) initGame();
    if (aiInterval) clearInterval(aiInterval);
    aiInterval = setInterval(aiMove, BASE_MOVE_INTERVAL);
    updateStatus();
}

function stopAI() {
    if (aiInterval) {
        clearInterval(aiInterval);
        aiInterval = null;
        updateStatus();
    }
}

startAIEl.addEventListener('click', startAI);
stopAIEl.addEventListener('click', stopAI);
resetEl.addEventListener('click', () => { stopAI(); initGame(); });

initGame();
