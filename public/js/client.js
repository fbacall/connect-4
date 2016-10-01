function drawBoard (element) {
    for (let col = 0; col < 7; col++) {
        var html = '<div class="column">';
        for (let row = 0; row < 6; row++) {
            html += '<div class="cell"></div>';
        }
        element.append(html + '</div>');
    }
}


function drawGame (game, element) {
    for (let col = 0; col < game.board.length - 1; col++) {
        for (let row = 0; row < game.board[col].length; row++) {
            element.find(`.column:eq(${col}) .cell:eq(${row})`).addClass(`player-${game.board[col][row]}`);
        }
    }
}

$(document).ready(function () {
    drawBoard($('#board'));
    var match = location.href.match(/\/game\/([a-z0-9]+)/);
    if (match) {
        var socket = io.connect('', {query: 'game=' + match[1]});

        $('.column').click(function () {
            socket.emit('place-token', $(this).index());
        });

        socket.on('player-number', function (number) {
            $('#player').text(`You are player ${number}`).addClass(`player-${number}`)
        });

        socket.on('state', function (game) {
            drawGame(game, $('#board'));
            if (game.state === 'won') {
                $('#status').text(`Player ${game.winner.number} wins!`).addClass(`player-${game.winner.number}`);
                game.winning.forEach((c) => {
                    $('#board').find(`.column:eq(${c[0]}) .cell:eq(${c[1]})`).addClass('winning');
                });
            } else if (game.state === 'draw') {
                $('#status').text('Draw!').removeClass('player-1 player-2');
            } else if (game.state === 'waiting') {
                $('#status').text('Waiting for opponent to join').removeClass('player-1 player-2');
            } else if (game.state === 'active') {
                $('#status').text(`Player ${game.turn.number}'s turn`).removeClass('player-1 player-2').addClass(`player-${game.turn.number}`);
            }
        });
    }
});
