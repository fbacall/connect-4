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

socket.on('place-token', function (data) {
    $('#status').html(`${playerName(data.turn)}'s turn`);
});

socket.on('room', function (data) {
    $('body').addClass('bg-' + data.background);
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

function Cell(props) {
    let classNames = 'token';

    if (props.player) {
        classNames += (' player-' + props.player);
    }
    if (props.new) {
        classNames += ' new';
    }
    return (
        <div className="cell"><div className={classNames}></div><div className="overlay"></div></div>
    );
}

function Column(props) {
    let cells = [];
    for (let i = 0; i < props.rows; i++) {
        let isNew = (props.last === i);
        cells.push(<Cell new={isNew} key={i * 100 + i} player={props.column[i]}/>);
    }

    return (
        <div className="column" onClick={() => props.onClick()}>{cells}</div>
    );
}

class Board extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            board: props.board || (new Array(parseInt(props.cols)).fill([])),
            last: []
        };
        socket.on('place-token',(data) => {
            let board = this.state.board.slice();
            let row = board[data.column].push(data.player.number) - 1;
            this.setState({ board: board, last: [data.column, row] });
        });
    }

    handleClick(col) {
        socket.emit('place-token', col);
    }

    render() {
        let columns = [];

        for (let i = 0; i < this.props.cols; i++) {
            columns.push(<Column key={i} last={this.state.last[0] === i ? this.state.last[1] : null} column={this.state.board[i]} rows={this.props.rows} onClick={() => this.handleClick(i)}/>);
        }

        return (
            <div className="board">{columns}</div>
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
        element.find(`.column:eq(${c[0]}) .token:eq(${c[1]})`).addClass('winning');
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
