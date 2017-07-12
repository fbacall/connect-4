class Connect4 {
    constructor(columns, rows, toWin) {
        this.columns = columns || 7;
        this.rows = rows || 6;
        this.toWin = toWin || 4;

        this.winner = null;
        this.state = 'waiting';

        this.board = new Array(columns);
        for (let i = 0; i < columns; i++) {
            this.board[i] = [];
        }
    }

    addPlayer(player) {
        if (this.player1 && this.player2) {
            return false;
        }

        if (!this.player1) {
            player.number = 1;
            this.player1 = player;
        } else if (!this.player2) {
            player.number = 2;
            this.player2 = player;
        }

        if (this.player1 && this.player2 && this.state === 'waiting') {
            this.start();
        }

        return true;
    };

    removePlayer(player) {
        if (this.player1 === player) {
            this.player1 = null;
            return true;
        } else if (this.player2 === player) {
            this.player2 = null;
            return true;
        } else {
            return false;
        }
    };

    start() {
        for (let i = 0; i < this.columns; i++) {
            this.board[i] = [];
        }

        this.turn = this.player1;
        this.state = 'active';
        console.log('Connect4 started');
    };

    placeToken(column) {
        if (this.player1 && this.player2) {
            if (this.board[column].length < this.rows) {
                this.board[column].push(this.turn.number);
                if (this.checkWin(column, this.board[column].length - 1)) {
                    this.state = 'won';
                    this.winner = this.turn;
                    this.loser = this.player1 === this.turn ? this.player2 : this.player1;
                } else if (this.checkDraw()) {
                    this.state = 'draw';
                } else {
                    this.switchPlayer();
                }
                return true;
            } else {
                return false;
            }
        }
    };

    checkWin(column, row) {
        const directions = [[0, 1], [1, -1], [1, 0], [1, 1]];
        const player = this.board[column][row];
        let victory = false;

        // Check each of the 4 axes around the selected cell
        directions.some((dir) => {
            let connected = 1;
            this.winning = [[column, row]];

            // Check forwards and backwards along the given direction
            [1, -1].some((modifier) => {
                let checkedColumn = column + (dir[0] * modifier);
                let checkedRow = row + (dir[1] * modifier);

                while (this.validCell(checkedColumn, checkedRow)) {
                    if (this.board[checkedColumn][checkedRow] === player) {
                        connected++;
                        this.winning.push([checkedColumn, checkedRow]);
                        if (connected === this.toWin) {
                            victory = true;
                            return true;
                        }
                    } else {
                        break;
                    }
                    checkedColumn += (dir[0] * modifier);
                    checkedRow += (dir[1] * modifier);
                }
            });

            if (victory)
                return true;
        });

        return victory;
    };

    checkDraw() {
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i].length < this.rows) {
                return false
            }
        }

        return true;
    };

    validCell(column, row) {
        return column >= 0 && row >= 0 && column < this.board.length && row < this.board[column].length;
    };

    switchPlayer() {
        this.turn = this.turn === this.player1 ? this.player2 : this.player1;
    };

    getState() {
        return {
            state: this.state,
            winning: this.winning,
            winner: this.winner,
            turn: this.turn,
            board: this.board,
            rows: this.rows,
            columns: this.columns,
            toWin: this.toWin
        };
    };
}

module.exports = Connect4;
