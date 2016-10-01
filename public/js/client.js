class Game {
    constructor (columns, rows, player1, player2) {
        this.columns = columns;
        this.rows = rows;
        this.player1 = player1;
        this.player2 = player2;
        this.turn = player1;
        this.winner = null;
        this.state = null;

        this.board = new Array(columns);
        for (let i = 0; i < columns; i++) {
            this.board[i] = [];
        }
    }

    placeToken (column) {
        if (this.board[column].length < this.rows) {
            this.board[column].push(this.turn.number);
            if (this.checkWin(column, this.board[column].length - 1)) {
                this.state = 'won';
                this.winner = this.turn;
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

    checkWin (column, row) {
        var directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        var player = this.board[column][row];
        var victory = false;

        // Check each of the 8 directions around the selected cell
        directions.some((dir) => {
            var connected = 1;
            this.winning = [[column, row]];

            // Check forwards and backwards along the given direction
            [1, -1].some((modifier) => {
                var checkedColumn = column + (dir[0] * modifier);
                var checkedRow = row + (dir[1] * modifier);

                while(this.validCell(checkedColumn, checkedRow)) {
                    if (this.board[checkedColumn][checkedRow] === player) {
                        connected++;
                        this.winning.push([checkedColumn, checkedRow]);
                        if (connected == 4) {
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
    }

    checkDraw () {
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i].length < this.rows) {
                return false
            }
        }

        return true;
    }

    validCell (column, row) {
        return column >= 0 && row >= 0 && column < this.board.length && row < this.board[column].length;
    }

    switchPlayer () {
        this.turn = this.turn === this.player1 ? this.player2 : this.player1;
    }

    draw (element) {
        for (let col = 0; col < this.board.length - 1; col++) {
            for (let row = 0; row < this.board[col].length; row++) {
                element.find(`.column:eq(${col}) .cell:eq(${row})`).addClass(`player-${this.board[col][row]}`);
            }
        }
    }
}

$(document).ready(function () {
    var p1 = { number: 1 };
    var p2 = { number: 2 };
    game = new Game(7, 6, p1, p2);
    $('#status').text(`Player ${game.turn.number}'s turn`).addClass(`player-${game.turn.number}`);

    $('.column').click(function () {
        if (!game.state) {
            game.placeToken($(this).index());
            game.draw($('#board'));

            if (game.state === 'won') {
                $('#status').text(`Player ${game.winner.number} wins!`).addClass(`player-${game.winner.number}`);
                game.winning.forEach((c) => {
                    $('#board').find(`.column:eq(${c[0]}) .cell:eq(${c[1]})`).addClass('winning');
                });
            } else if (game.state === 'draw') {
                $('#status').text('Draw!').removeClass('player-1 player-2');
            } else {
                $('#status').text(`Player ${game.turn.number}'s turn`).removeClass('player-1 player-2').addClass(`player-${game.turn.number}`);
            }
        }
    });
});
