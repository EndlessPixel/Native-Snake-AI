        // ---------- 游戏配置 ----------
        const GRID_SIZE = 20;
        const CELL_SIZE = 20;
        const BASE_MOVE_INTERVAL = 300;   // 基础间隔300ms，给模拟计算留足时间

        // 游戏状态
        let snake = [];          // 蛇身坐标 {x, y}
        let food = { x: 0, y: 0 };
        let direction = 'right';
        let nextDirection = 'right';
        let score = 0;
        let aiInterval = null;
        let gameRunning = false;
        let gameWinFlag = false;  // 是否胜利结束

        // DOM 元素
        const gameEl = document.getElementById('game');
        const startAIEl = document.getElementById('startAI');
        const stopAIEl = document.getElementById('stopAI');
        const resetEl = document.getElementById('reset');
        const statusEl = document.getElementById('status');

        // ---------- 辅助函数 ----------
        function copySnake(snakeArr) {
            return snakeArr.map(seg => ({ ...seg }));
        }

        // 动态步数: 根据蛇长和剩余空格决定前瞻深度 (范围 4~10)
        function getDynamicSteps() {
            const totalCells = GRID_SIZE * GRID_SIZE;
            const emptyCells = totalCells - snake.length;
            const len = snake.length;
            
            if (emptyCells <= 15) return 10;       // 快满了，深度模拟
            if (emptyCells <= 30 || len > 300) return 8;
            if (len > 200) return 7;
            if (len > 100) return 6;
            return 5;   // 基础5步
        }

        // 洪水填充: 计算从 startPos 出发能到达的格子数 (不考虑尾巴释放，直接按当前蛇身障碍)
        // snakeArr 是完整的蛇身数组（模拟时传入）
        function getReachableArea(startPos, snakeArr) {
            const snakeSet = new Set(snakeArr.map(s => `${s.x},${s.y}`));
            const queue = [{ x: startPos.x, y: startPos.y }];
            const visited = new Set([`${startPos.x},${startPos.y}`]);
            
            while (queue.length) {
                const { x, y } = queue.shift();
                const neighbors = [
                    { x, y: y-1 }, { x, y: y+1 },
                    { x: x-1, y }, { x: x+1, y }
                ];
                for (const n of neighbors) {
                    if (n.x < 0 || n.x >= GRID_SIZE || n.y < 0 || n.y >= GRID_SIZE) continue;
                    const key = `${n.x},${n.y}`;
                    if (visited.has(key)) continue;
                    if (snakeSet.has(key)) continue;
                    visited.add(key);
                    queue.push(n);
                }
            }
            return visited.size;
        }

        // 在模拟中，给定蛇身和当前食物，重新生成一个不重叠的食物 (快速尝试)
        function regenerateFoodForSimulation(snakeArr, currentFood) {
            const total = GRID_SIZE * GRID_SIZE;
            if (snakeArr.length >= total) return null; // 胜利无空位
            // 随机尝试150次
            for (let i = 0; i < 150; i++) {
                const newFood = {
                    x: Math.floor(Math.random() * GRID_SIZE),
                    y: Math.floor(Math.random() * GRID_SIZE)
                };
                if (!snakeArr.some(seg => seg.x === newFood.x && seg.y === newFood.y)) {
                    return newFood;
                }
            }
            // 降级：顺序查找
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (!snakeArr.some(seg => seg.x === x && seg.y === y)) {
                        return { x, y };
                    }
                }
            }
            return null; // 全满
        }

        // 模拟在某个方向走 steps 步，返回评分（越高越好）
        // 内部贪心决策：每一步选择安全的、最接近食物的方向（避免递归，轻量）
        function simulateDirection(initialSnake, initialFood, startDir, steps) {
            let simSnake = copySnake(initialSnake);
            let simFood = { ...initialFood };
            let simDir = startDir;
            let reward = 0;      // 吃到食物累计奖励
            let ateCount = 0;
            
            for (let step = 0; step < steps; step++) {
                const head = simSnake[0];
                let newHead = { ...head };
                switch (simDir) {
                    case 'up':    newHead.y--; break;
                    case 'down':  newHead.y++; break;
                    case 'left':  newHead.x--; break;
                    case 'right': newHead.x++; break;
                }
                
                // 碰撞检测
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    return -10000 + reward;   // 死亡惩罚极大
                }
                if (simSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
                    return -10000 + reward;
                }
                
                // 移动
                simSnake.unshift(newHead);
                const ate = (newHead.x === simFood.x && newHead.y === simFood.y);
                if (ate) {
                    // 吃到食物奖励加大 (基础+200，每多吃一次额外累加)
                    reward += 250;
                    ateCount++;
                    // 重新生成食物
                    const newFood = regenerateFoodForSimulation(simSnake, simFood);
                    if (!newFood) {
                        // 模拟胜利，给予巨额奖励
                        return 100000 + reward;
                    }
                    simFood = newFood;
                    // 吃到食物不删尾巴，长度+1
                } else {
                    simSnake.pop();   // 没吃到删尾巴
                }
                
                // 如果已经填满全场 => 胜利
                if (simSnake.length === GRID_SIZE * GRID_SIZE) {
                    return 100000 + reward;
                }
                
                // ---------- 为下一步选择方向 (轻量贪心: 安全+距离优先) ----------
                const opposite = { up:'down', down:'up', left:'right', right:'left' };
                const possibleMoves = ['up', 'down', 'left', 'right'].filter(d => d !== opposite[simDir]);
                let bestNextDir = null;
                let bestDist = Infinity;
                const curHead = simSnake[0];
                
                for (const d of possibleMoves) {
                    let testHead = { ...curHead };
                    switch (d) {
                        case 'up':    testHead.y--; break;
                        case 'down':  testHead.y++; break;
                        case 'left':  testHead.x--; break;
                        case 'right': testHead.x++; break;
                    }
                    // 边界或撞自身检查
                    if (testHead.x < 0 || testHead.x >= GRID_SIZE || testHead.y < 0 || testHead.y >= GRID_SIZE) continue;
                    if (simSnake.some(seg => seg.x === testHead.x && seg.y === testHead.y)) continue;
                    const dist = Math.abs(testHead.x - simFood.x) + Math.abs(testHead.y - simFood.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestNextDir = d;
                    }
                }
                
                if (bestNextDir) {
                    simDir = bestNextDir;
                } else {
                    // 无路可走，即将死亡
                    return -8000 + reward;
                }
            }
            
            // 模拟结束，评估最终状态的生存空间 + 距离食物的吸引力
            const finalHead = simSnake[0];
            const finalArea = getReachableArea(finalHead, simSnake);
            const distToFood = Math.abs(finalHead.x - simFood.x) + Math.abs(finalHead.y - simFood.y);
            // 评分权重： 生存空间 * 12  + 吃到食物奖励 - 距离 * 3  
            const finalScore = finalArea * 12 - distToFood * 3 + reward * 1.2;
            return finalScore;
        }

        // ---------- AI 决策核心：前瞻评估每个方向 ----------
        function aiDecideDirection() {
            if (!gameRunning) return;
            const head = snake[0];
            const opposite = { up:'down', down:'up', left:'right', right:'left' };
            const possibleDirs = ['up', 'down', 'left', 'right'].filter(d => d !== opposite[direction]);
            
            let bestDir = null;
            let bestScore = -Infinity;
            const steps = getDynamicSteps();   // 动态步数
            
            for (const dir of possibleDirs) {
                // 快速过滤：第一步即撞墙/身的直接丢弃 (避免无效模拟)
                let testHead = { ...head };
                switch (dir) {
                    case 'up':    testHead.y--; break;
                    case 'down':  testHead.y++; break;
                    case 'left':  testHead.x--; break;
                    case 'right': testHead.x++; break;
                }
                if (testHead.x < 0 || testHead.x >= GRID_SIZE || testHead.y < 0 || testHead.y >= GRID_SIZE) continue;
                if (snake.some(seg => seg.x === testHead.x && seg.y === testHead.y)) continue;
                
                const scoreVal = simulateDirection(snake, food, dir, steps);
                if (scoreVal > bestScore) {
                    bestScore = scoreVal;
                    bestDir = dir;
                }
            }
            
            if (bestDir) {
                nextDirection = bestDir;
            } else {
                // 保底：什么都不选就保持原方向（但这种情况极少，一般不会）
                if (possibleDirs.length > 0) nextDirection = possibleDirs[0];
            }
        }

        // ---------- 原有游戏逻辑（移动，碰撞，渲染）----------
        function generateFood() {
            if (snake.length >= GRID_SIZE * GRID_SIZE) {
                gameWin();
                return;
            }
            // 快速随机尝试
            for (let i = 0; i < 1000; i++) {
                const randX = Math.floor(Math.random() * GRID_SIZE);
                const randY = Math.floor(Math.random() * GRID_SIZE);
                if (!snake.some(seg => seg.x === randX && seg.y === randY)) {
                    food = { x: randX, y: randY };
                    return;
                }
            }
            // 极端情况：遍历所有格子
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (!snake.some(seg => seg.x === x && seg.y === y)) {
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
            
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    const cell = document.createElement('div');
                    cell.style.width = `${CELL_SIZE}px`;
                    cell.style.height = `${CELL_SIZE}px`;
                    
                    const isHead = (snake[0] && snake[0].x === x && snake[0].y === y);
                    const isSnakeBody = !isHead && snake.some(seg => seg.x === x && seg.y === y);
                    
                    if (isHead) {
                        cell.className = 'snake-head';
                    } else if (isSnakeBody) {
                        cell.className = 'snake';
                    } else if (x === food.x && y === food.y) {
                        cell.className = 'food';
                    } else {
                        cell.className = 'empty';
                        cell.style.backgroundColor = '#f0f0f000';
                    }
                    gameEl.appendChild(cell);
                }
            }
        }

        function moveSnake() {
            if (!gameRunning) return;
            
            direction = nextDirection;
            const head = { ...snake[0] };
            switch (direction) {
                case 'up':    head.y--; break;
                case 'down':  head.y++; break;
                case 'left':  head.x--; break;
                case 'right': head.x++; break;
                default: break;
            }
            
            // 碰撞边界或自身
            if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE ||
                snake.some(seg => seg.x === head.x && seg.y === head.y)) {
                gameOver();
                return;
            }
            
            snake.unshift(head);
            const ate = (head.x === food.x && head.y === food.y);
            if (ate) {
                score += 10;
                generateFood();   // 可能会触发胜利
                if (!gameRunning) return;
            } else {
                snake.pop();
            }
            
            renderGrid();
            updateStatus();
            
            // 胜利检测 (generateFood 里可能触发胜利，但二次确认)
            if (snake.length === GRID_SIZE * GRID_SIZE && !gameWinFlag) {
                gameWin();
            }
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
            statusEl.innerHTML = `状态：${aiStatus} | 得分：${score} | 蛇长：${snake.length} | 前瞻步数: ${getDynamicSteps()}`;
        }
        
        // ---------- 重置 / 初始化 ----------
        function initGame() {
            stopAI();
            // 初始蛇
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
        
        // AI 移动驱动
        function aiMove() {
            if (!gameRunning) return;
            aiDecideDirection();
            moveSnake();
        }
        
        function startAI() {
            if (!gameRunning) {
                // 游戏未运行或已结束，重置后再启动
                initGame();
            }
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
        
        // 事件绑定
        startAIEl.addEventListener('click', startAI);
        stopAIEl.addEventListener('click', stopAI);
        resetEl.addEventListener('click', () => {
            stopAI();
            initGame();
        });
        
        // 启动游戏初始
        initGame();
