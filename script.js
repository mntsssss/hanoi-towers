class HanoiTowers {
    constructor() {
        this.rods = [[], [], []];
        this.numDisks = 5;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.selectedRod = null;
        this.gameActive = false;
        
        // Попытка загрузить данные авторизованного игрока из локального хранилища браузера
        this.player = JSON.parse(localStorage.getItem('tg_user')) || null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupTelegramCallback();
        this.checkAuth();
        this.loadStatistics();
    }

    bindEvents() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.numDisks = parseInt(e.target.value);
            this.updateMinMoves();
            this.newGame();
        });
        document.getElementById('refreshStats').addEventListener('click', () => this.loadStatistics());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    // Метод, который перехватывает успешный вход от виджета Telegram
    setupTelegramCallback() {
        window.onTelegramAuth = async (user) => {
            try {
                const authRes = await fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                });
                const data = await authRes.json();
                if (data.success) {
                    // Сохраняем игрока в сессию браузера, чтобы не входить каждый раз
                    localStorage.setItem('tg_user', JSON.stringify(data.player));
                    this.player = data.player;
                    this.showGame();
                    this.newGame();
                }
            } catch (err) {
                console.error('Ошибка авторизации на сервере:', err);
            }
        };
    }

    // Проверяем, залогинен ли пользователь
    checkAuth() {
        if (this.player) {
            this.showGame();
            this.newGame();
        } else {
            this.showAuth();
        }
    }

    // Показываем интерфейс игры и имя пользователя
    showGame() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('gameInterface').style.display = 'block';
        document.getElementById('userProfile').textContent = `Игрок: ${this.player.first_name} ${this.player.username ? '(@' + this.player.username + ')' : ''}`;
    }

    // Показываем блок авторизации, если пользователь не вошел
    showAuth() {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('gameInterface').style.display = 'none';
    }

    // Выход из профиля
    logout() {
        localStorage.removeItem('tg_user');
        this.player = null;
        this.stopTimer();
        this.showAuth();
        location.reload(); 
    }

    newGame() {
        if (!this.player) return;
        this.resetGame();
        this.initializeDisks();
        this.render();
        this.startTimer();
        this.gameActive = true;
        this.showMessage('Игра началась!');
    }

    resetGame() {
        this.rods = [[], [], []];
        this.moves = 0;
        this.selectedRod = null;
        this.updateMovesDisplay();
        this.stopTimer();
        this.startTime = null;
    }

    initializeDisks() {
        for (let i = this.numDisks; i >= 1; i--) {
            this.rods[0].push(i);
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        if (!this.startTime) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timeDisplay').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateMovesDisplay() {
        document.getElementById('movesCount').textContent = this.moves;
    }

    updateMinMoves() {
        const minMoves = Math.pow(2, this.numDisks) - 1;
        document.getElementById('minMoves').textContent = minMoves;
    }

    getElapsedTime() {
        if (!this.startTime) return 0;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    handleRodClick(rodIndex) {
        if (!this.gameActive) return;

        if (this.selectedRod === null) {
            if (this.rods[rodIndex].length > 0) {
                this.selectedRod = rodIndex;
                this.render();
                this.showMessage('Куда переместить?');
            }
        } else {
            if (this.selectedRod === rodIndex) {
                this.selectedRod = null;
                this.render();
                this.showMessage('');
            } else if (this.isValidMove(this.selectedRod, rodIndex)) {
                this.moveDisk(this.selectedRod, rodIndex);
                this.selectedRod = null;
                
                if (this.checkWin()) {
                    this.gameWon();
                }
            } else {
                this.showMessage('Нельзя так переместить!');
                setTimeout(() => this.showMessage(''), 2000);
            }
        }
    }

    isValidMove(fromRod, toRod) {
        if (this.rods[fromRod].length === 0) return false;
        const movingDisk = this.rods[fromRod][this.rods[fromRod].length - 1];
        if (this.rods[toRod].length === 0) return true;
        const targetDisk = this.rods[toRod][this.rods[toRod].length - 1];
        return movingDisk < targetDisk;
    }

    moveDisk(fromRod, toRod) {
        const disk = this.rods[fromRod].pop();
        this.rods[toRod].push(disk);
        this.moves++;
        this.updateMovesDisplay();
        this.render();
    }

    checkWin() {
        return this.rods[2].length === this.numDisks;
    }

    gameWon() {
        this.gameActive = false;
        this.stopTimer();
        
        const completionTime = this.getElapsedTime();
        
        let difficultyText = 'Средняя';
        if (this.numDisks <= 3) difficultyText = 'Легкая';
        else if (this.numDisks >= 6) difficultyText = 'Сложная';
        
        this.showMessage(`Победа! Время: ${document.getElementById('timeDisplay').textContent}, Ходов: ${this.moves}`, true, 'success');
        
        // Отправка результата игры в базу данных через Node.js API
        this.saveGameResult(completionTime, this.moves, difficultyText);
    }

    async saveGameResult(completionTime, movesCount, difficulty) {
        try {
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: this.player.tg_id,
                    completionTime: completionTime,
                    movesCount: movesCount,
                    difficulty: difficulty
                })
            });
            
            if (response.ok) {
                this.loadStatistics(); // Перезагружаем таблицу результатов
            }
        } catch (error) {
            console.error('Ошибка при сохранении результата:', error);
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/games?limit=20');
            const games = await response.json();
            this.displayStatistics(games);
        } catch (error) {
            console.error('Ошибка при загрузке статистики:', error);
        }
    }

    displayStatistics(games) {
        const container = document.getElementById('statsContainer');
        
        if (!games || games.length === 0) {
            container.innerHTML = '<p>Нет сохраненных игр</p>';
            return;
        }
        
        let html = '<table class="stats-table"><tr><th>Игрок</th><th>Дата</th><th>Сложность</th><th>Время</th><th>Ходы</th></tr>';
        
        games.forEach(game => {
            const date = new Date(game.game_date).toLocaleString('ru-RU');
            const time = this.formatTime(game.completion_time);
            
            html += `
                <tr>
                    <td>${game.player_name}</td>
                    <td>${date}</td>
                    <td>${game.difficulty}</td>
                    <td>${time}</td>
                    <td>${game.moves_count}</td>
                </tr>
            `;
        });
        
        html += '</table>';
        container.innerHTML = html;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showMessage(text, isError = false, type = '') {
        const messageEl = document.getElementById('message');
        messageEl.innerHTML = text;
        messageEl.className = type ? `message ${type}` : 'message';
    }

    render() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        const rodLabels = ['A', 'B', 'C'];
        
        for (let i = 0; i < 3; i++) {
            const rod = document.createElement('div');
            rod.className = 'rod';
            rod.innerHTML = `
                <div class="rod-pole"></div>
                <div class="rod-base"></div>
                <div class="discs-container" id="rod-${i}"></div>
                <div class="rod-label">Стержень ${rodLabels[i]}</div>
            `;
            
            rod.addEventListener('click', () => this.handleRodClick(i));
            gameBoard.appendChild(rod);
            
            const container = document.getElementById(`rod-${i}`);
            
            for (let j = this.rods[i].length - 1; j >= 0; j--) {
                const diskSize = this.rods[i][j];
                const disk = document.createElement('div');
                disk.className = 'disc';
                
                if (this.selectedRod === i && j === this.rods[i].length - 1) {
                    disk.classList.add('selected');
                }
                
                const width = 50 + diskSize * 20;
                disk.style.width = width + 'px';
                container.appendChild(disk);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HanoiTowers();
});
