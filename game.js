function Game (columns, rows, player1, player2) {
    this.columns = columns;
    this.rows = rows;
    this.player1 = player1;
    this.player2 = player2;
    this.turn = player1;
    this.winner = null;
    this.state = 'waiting';

    this.board = new Array(columns);
    for (var i = 0; i < columns; i++) {
        this.board[i] = [];
    }
}

Game.prototype.addPlayer = function (player) {
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

    if (this.player1 && this.player2) {
        this.start();
    }

    return true;
};

Game.prototype.removePlayer = function (player) {
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

Game.prototype.start = function () {
    for (var i = 0; i < this.columns; i++) {
        this.board[i] = [];
    }

    this.turn = this.player1;
    this.state = 'active';
    console.log('Game started');
};

Game.prototype.placeToken = function (column) {
    if (this.player1 && this.player2) {
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
};

Game.prototype.checkWin = function (column, row) {
    var directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    var player = this.board[column][row];
    var victory = false;

    // Check each of the 8 directions around the selected cell
    var game = this;
    directions.some(function (dir) {
        var connected = 1;
        game.winning = [[column, row]];

        // Check forwards and backwards along the given direction
        
        [1, -1].some(function (modifier) {
            var checkedColumn = column + (dir[0] * modifier);
            var checkedRow = row + (dir[1] * modifier);

            while(game.validCell(checkedColumn, checkedRow)) {
                if (game.board[checkedColumn][checkedRow] === player) {
                    connected++;
                    game.winning.push([checkedColumn, checkedRow]);
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
};

Game.prototype.checkDraw = function () {
    for (var i = 0; i < this.board.length; i++) {
        if (this.board[i].length < this.rows) {
            return false
        }
    }

    return true;
};

Game.prototype.validCell = function (column, row) {
    return column >= 0 && row >= 0 && column < this.board.length && row < this.board[column].length;
};

Game.prototype.switchPlayer = function () {
    this.turn = this.turn === this.player1 ? this.player2 : this.player1;
};

Game.prototype.getState = function () {
  return {
      state: this.state,
      winning: this.winning,
      winner: this.winner,
      turn: this.turn,
      board: this.board
      //player1: this.player1.name,
      //player2: this.player2.name
  };
};

exports.Game = Game;
