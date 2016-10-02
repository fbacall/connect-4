var socket;
var id;

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
    for (let col = 0; col < game.board.length; col++) {
        for (let row = 0; row < game.board[col].length; row++) {
            element.find(`.column:eq(${col}) .cell:eq(${row})`).addClass(`player-${game.board[col][row]}`);
        }
    }
}

function playerName(player) {
    return '<span class="player-name'+(player.number ? ` player-${player.number}` : '') +'">' + player.name + '</span>';
}

function connect () {
    var name = $('#name-input').val();

    socket = io.connect('', {query: 'name=' + name + '&id=' + id});

    socket.on('player-number', function (number) {
        $('#player').text(`You are player ${number}`).addClass(`player-${number}`)
    });

    socket.on('chat-message', function (data) {
        $('<div class="chat-message">' + playerName(data.player) +
            ': <span class="message">' + data.message + '</span></div>').appendTo($('#chat'));

    });

    socket.on('chat-status', function (data) {
        $('#chat').append(
            '<div class="chat-status">' + playerName(data.player) + ' ' + data.message + '</div>');
    });

    socket.on('state', function (game) {
        drawGame(game, $('#board'));
        if (game.state === 'won') {
            $('#status').html(`${playerName(game.turn)} wins!`);

            // Highlight winning 4
            game.winning.forEach((c) => {
                $('#board').find(`.column:eq(${c[0]}) .cell:eq(${c[1]})`).addClass('winning');
            });
        } else if (game.state === 'draw') {
            $('#status').html('Draw!');
        } else if (game.state === 'waiting') {
            $('#status').html('Waiting for opponent to join');
        } else if (game.state === 'active') {
            $('#status').html(`${playerName(game.turn)}'s turn`);
        }

        $('#chat-status').text(game.connected + ' users connected');
    });

    $('#name-modal').modal('hide');
}

$(document).ready(function () {
    var match = location.href.match(/\/game\/([a-z0-9]+)/);
    if (match) {
        drawBoard($('#board'));

        id = match[1];
        $('#name-modal').modal('show');

        $('#connect').click(connect);
        $('#name-input').keyup(function (e) {
            if (e.keyCode == 13) {
                connect();
            }
        });

        $('.column').click(function () {
            socket.emit('place-token', $(this).index());
        });

        $('#chat-input').keyup(function (e) {
            if (e.keyCode == 13) {
                socket.emit('chat-message', $(this).val());
                $(this).val('');
            }
        });
    }
});

