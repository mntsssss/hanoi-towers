class HanoiTowers {
    constructor() {
        this.rods = [[], [], []];
        this.numDisks = 5;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.selectedRod = null;
        this.gameActive = false;
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

    setupTelegramCallback() {
        window.onTelegramAuth = async (user) => {
            try {
                const authRes = await fetch('http://localhost:3000/api/auth/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                });
                const data = await authRes.json();
                if (data.success) {
                    this.player = data.player;
                    localStorage.setItem('tg_user', JSON.stringify(this.player));
                    this.checkAuth();
                    this.loadStatistics();
                }
            } catch (error) { console.error('Ошибка авторизации:', error); }
        };
    }

    checkAuth() {
        if (this.player) {
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('gameInterface').style.display = 'block';
            document.getElementById('userProfile').innerHTML = `Привет, ${this.player.first_name}!`;
            this.updateMinMoves();
            this.newGame();
        } else {
            document.getElementById('authSection').style.display = 'block';
            document.getElementById('gameInterface').style.display = 'none';
        }
    }

    logout() {
        localStorage.removeItem('tg_user');
        this.player = null;
        this.checkAuth();
    }

    updateMinMoves() {
        document.getElementById('minMoves').textContent = Math.pow(2, this.numDisks) - 1;
    }

    newGame() {
        this.rods = [[], [], []];
        for (let i = this.numDisks; i >= 1; i--) this.rods[0].push(i);
        this.moves = 0;
        document.getElementById('movesCount').textContent = this.moves;
        this.gameActive = true;
        this.resetTimer();
        this.startTimer();
        this.render();
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const t = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('timeDisplay').textContent = `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toString().padStart(2,'0')}`;
        }, 1000);
    }

    resetTimer() { clearInterval(this.timerInterval); document.getElementById('timeDisplay').textContent = '00:00'; }

    handleRodClick(i) {
        if (!this.gameActive) return;
        if (this.selectedRod === null) { if (this.rods[i].length > 0) this.selectedRod = i; }
        else { if (this.selectedRod !== i) this.moveDisk(this.selectedRod, i); this.selectedRod = null; }
        this.render();
    }

    moveDisk(f, t) {
        if (this.rods[f].length === 0) return;
        const d = this.rods[f][this.rods[f].length - 1];
        if (this.rods[t].length > 0 && d > this.rods[t][this.rods[t].length - 1]) return;
        this.rods[f].pop(); this.rods[t].push(d);
        this.moves++;
        document.getElementById('movesCount').textContent = this.moves;
        this.checkWin();
    }

    async checkWin() {
        if (this.rods[1].length === this.numDisks || this.rods[2].length === this.numDisks) {
            this.gameActive = false;
            clearInterval(this.timerInterval);
            
            // ИСПРАВЛЕНИЕ: берем tg_id, который пришел из базы в объекте this.player
            const gameData = {
                playerId: this.player.tg_id, 
                completionTime: document.getElementById('timeDisplay').textContent,
                movesCount: this.moves,
                difficulty: this.numDisks
            };

            try {
                const res = await fetch('http://localhost:3000/api/games', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gameData)
                });
                if (res.ok) this.loadStatistics();
            } catch (err) { console.error(err); }
        }
    }

    async loadStatistics() {
        try {
            const res = await fetch('http://localhost:3000/api/games?limit=20');
            const games = await res.json();
            document.getElementById('statsContainer').innerHTML = '<table>' + games.map(g => 
                `<tr><td>${g.player_name}</td><td>${g.difficulty}</td><td>${g.moves_count}</td><td>${g.completion_time}</td></tr>`
            ).join('') + '</table>';
        } catch (err) { console.error(err); }
    }

    render() {
        document.getElementById('gameBoard').innerHTML = '';
        this.rods.forEach((rod, i) => {
            const d = document.createElement('div');
            d.className = 'rod';
            d.onclick = () => this.handleRodClick(i);
            d.innerHTML = `<div class="discs-container">${rod.map(sz => `<div class="disc" style="width:${50+sz*20}px"></div>`).join('')}</div>`;
            document.getElementById('gameBoard').appendChild(d);
        });
    }
}
document.addEventListener('DOMContentLoaded', () => new HanoiTowers());
