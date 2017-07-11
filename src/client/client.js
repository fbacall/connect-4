import React from 'react';
import ReactDOM from 'react-dom';
import io from 'socket.io-client';
import Geohash from './latlon-geohash.js';

let geohash = null;
let parts = window.location.pathname.split('/');

const socket = io({ path: parts.slice(0, parts.length - 2).join('/') + '/socket.io' });

socket.on('player-number', function (number) {
    $('#player').text(`You are player ${number}`).addClass(`player-${number}`)
});

socket.on('chat-message', function (data) {
    $('<div class="chat-message">' + playerName(data.player) +
        ': <span class="message">' + data.message + '</span></div>').appendTo($('#chat'));
    scrollChat();
});

socket.on('chat-status', function (data) {
    $('#chat').append(
        '<div class="chat-status">' + playerName(data.player) + ' ' + data.message + '</div>');
    scrollChat();
});

socket.on('state', function (game) {
    console.log(game);
    let board = document.getElementById('board');
    if (board) {
        drawBoard(board, game.columns, game.rows, game.board);
        $('#numToWin').text(game.toWin);
    }
    if (game.state === 'won') {
        $('#status').html(`${playerName(game.turn)} wins!`);
        highlightWinningCells(game.winning, $('#board'));
    } else if (game.state === 'draw') {
        $('#status').html('Draw!');
    } else if (game.state === 'waiting') {
        $('#status').html('Waiting for opponent to join');
    } else if (game.state === 'active') {
        $('#status').html(`${playerName(game.turn)}'s turn`);
    }

    $('#chat-status').text(game.connected + ' users connected');
});

function getGeohash(callback) {
    if (geohash) {
        callback(geohash);
    } else {
        navigator.geolocation.getCurrentPosition(function (pos) {
            geohash = Geohash.encode(pos.coords.latitude, pos.coords.longitude, 9);
            callback(geohash);
        });
    }
}

function showSliderValue(slider) {
    slider.parent().find('span').text(slider.val());
}

function Column(props) {
    let cells = [];
    for (let i = 0; i < props.rows; i++) {
        cells.push(<Cell key={i} player={props.cells[i]}/>);
    }
    return (
        <div className="column">
            {cells}
        </div>
    );
}

function Cell(props) {
    let classNames = 'cell';
    if (props.player) {
        classNames += (' player-' + props.player);
    }
    return (
        <div className={classNames}></div>
    );
}

class Board extends React.Component {
    constructor(props) {
        super(props);
        // this.state = {
        //     board: props.board || (new Array(parseInt(props.cols)).fill([]))
        // };
        // socket.on('state',(game) => {
        //     console.log('updating');
        //     this.state.board = game.board;
        // });
        // console.log(this.state);
    }

    handleClick(i) {
    }

    render() {
        let colList = [];

        for (let i = 0; i < this.props.cols; i++) {
            colList.push(<Column rows={this.props.rows} key={i} cells={this.props.board[i] || []} />);
        }

        return (
            <div className="board">
                {colList}
            </div>
        );
    }
}

Board.defaultProps = { cols: 7, rows: 6, board: [] };

function drawBoard (element, cols, rows, board, winning) {
    ReactDOM.render(
        <Board rows={rows} cols={cols} board={board}/>,
        element
    );
}

function highlightWinningCells(winning, element) {
    winning.forEach((c) => {
        element.find(`.column:eq(${c[0]}) .cell:eq(${c[1]})`).addClass('winning');
    });
}

function playerName(player) {
    return '<span class="player-name'+(player.number ? ` player-${player.number}` : '') +'">' + player.name + '</span>';
}

function scrollChat() {
    var e = $('#chat');
    e.scrollTop(e[0].scrollHeight);
}

function connect(id) {
    socket.emit('join', { id: id, name: $('#name-input').val() });
    $('#name-modal').modal('hide');
}

$(document).ready(function () {
    let match = window.location.href.match(/\/game\/([a-z0-9]+)/);
    if (match) {
        $('#name-modal').modal('show');
        let id = match[1];

        $('#connect').click(function () { connect(id) });
        $('#name-input').keyup(function (e) {
            if (e.keyCode == 13) {
                connect(id);
            }
        });

        $('#board').on('click', '.column', function () {
            socket.emit('place-token', $(this).index());
        });

        $('#chat-input').keyup(function (e) {
            if (e.keyCode == 13) {
                socket.emit('chat-message', $(this).val());
                $(this).val('');
            }
        });
    } else {
        $('input[type=range]').on('input', function () {
            showSliderValue($(this));
        }).each(function () {
            showSliderValue($(this));
        });

        if (navigator.geolocation) {
            $('#local-games-container').show();
            // Fetch "nearby" games
            $('#find-local-games').click(function () {
                getGeohash(function (geohash) {
                    $.ajax({
                        url: 'games/' + geohash,
                        dataType: 'json',
                        success: function (data) {
                            $('#local-games').html('');
                            if (data.length) {
                                data.forEach(function (data) {
                                    if (data.game.player1) {
                                        var el = $('<a href="game/' + data.id + '" class="local-game small-board">' +
                                            playerName(data.game.player1) +
                                            (data.game.player2 ? ' vs. ' + playerName(data.game.player2) : "'s game") +
                                            '</a>');
                                        var board = $('<div></div>');
                                        el.appendTo($('#local-games'));
                                        board.appendTo(el);
                                        drawBoard(board, data.game.columns, data.game.rows, data.game.board);
                                    }
                                });
                            } else {
                                $('#local-games').text('No games found');
                            }
                        }
                    });
                });
                return false;
            });

            $('#create-geolocated-game').show().click(function () {
                getGeohash(function (geohash) {
                    $('#geohash').val(geohash);
                    document.getElementById('form').submit();
                });
                return false;
            });

            $('#create-game').show().click(function () {
                $('#geohash').val('');

                return true;
            });
        }

        // Show recent game results
        $.ajax({
            url: 'results',
            dataType: 'json',
            success: function (data) {
                $('#recent-results').html('');
                if (data.length) {
                    data.forEach(function (result) {
                        var el = $('<div class="small-board">' +
                            playerName(result.winner) + (result.draw ? ' drew against ' : ' beat ') +
                            playerName(result.loser) + '</div>');
                        var board = $('<div></div>');
                        el.appendTo($('#recent-results'));
                        board.appendTo(el);
                        drawBoard(board[0], result.columns, result.rows, result.board);
                        if (!result.draw) {
                            highlightWinningCells(result.winning, board);
                        }
                    });
                } else {
                    $('#recent-results').text('No recent results');
                }
            }
        });
    }
});
