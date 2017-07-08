import React from 'react';
import ReactDOM from 'react-dom';
import io from 'socket.io-client';
import Geohash from './latlon-geohash.js';

var socket;
var id;
var geohash = null;

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
        cells.push(<Cell key={i} />);
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
    constructor() {
        super();
        this.state = {
            squares: Array(9).fill(null),
            xIsNext: true
        };
    }

    handleClick(i) {
        const squares = this.state.squares.slice();
        squares[i] = this.state.xIsNext ? 'X' : 'O';
        this.setState({
            squares: squares,
            xIsNext: !this.state.xIsNext
        });
    }

    render() {
        let cols = this.props.cols || 7;
        let rows = this.props.rows || 6;
        let colList = [];

        for (let i = 0; i < cols; i++) {
            colList.push(<Column rows={rows} key={i} />);
        }

        return (
            <div className="board">
                {colList}
            </div>
        );
    }
}

function drawBoard (element, cols, rows) {
    console.log(element);
    ReactDOM.render(
        <Board rows={rows} cols={cols} />,
        element
    );
}

function drawGame(board, element) {
    for (let col = 0; col < board.length; col++) {
        for (let row = 0; row < board[col].length; row++) {
            element.find(`.column:eq(${col}) .cell:eq(${row})`).addClass(`player-${board[col][row]}`);
        }
    }
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

function connect() {
    var name = $('#name-input').val();

    var parts = window.location.pathname.split('/');
    socket = io({ path: parts.slice(0, parts.length - 2).join('/') + '/socket.io', query: 'name=' + name + '&id=' + id});

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
            drawBoard(board, game.columns, game.rows);
            $('#numToWin').text(game.toWin);
        }
        drawGame(game.board, $('#board'));
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

    $('#name-modal').modal('hide');
}

$(document).ready(function () {
    var match = window.location.href.match(/\/game\/([a-z0-9]+)/);
    if (match) {
        id = match[1];
        $('#name-modal').modal('show');

        $('#connect').click(connect);
        $('#name-input').keyup(function (e) {
            if (e.keyCode == 13) {
                connect();
            }
        });

        $('#board').on('click','.column', function () {
            socket.emit('place-token', $(this).index());
        });

        $('#chat-input').keyup(function (e) {
            if (e.keyCode == 13) {
                socket.emit('chat-message', $(this).val());
                $(this).val('');
            }
        });
    } else {

        $(document).ready(function () {
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
                        $.ajax({ url: 'games/' + geohash,
                            dataType: 'json',
                            success: function (data) {
                                $('#local-games').html('');
                                if (data.length) {
                                    data.forEach(function (data) {
                                        if (data.game.player1) {
                                            var el = $('<a href="game/'+data.id+'" class="local-game small-board">' +
                                                playerName(data.game.player1) +
                                                (data.game.player2 ? ' vs. ' + playerName(data.game.player2) : "'s game") +
                                                '</a>');
                                            var board = $('<div></div>');
                                            el.appendTo($('#local-games'));
                                            board.appendTo(el);
                                            drawBoard(board);
                                            drawGame(data.game.board, board);
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
            $.ajax({ url: 'results',
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
                            drawBoard(board[0], result.columns, result.rows);
                            drawGame(result.board, board);
                            if (!result.draw) {
                                highlightWinningCells(result.winning, board);
                            }
                        });
                    } else {
                        $('#recent-results').text('No recent results');
                    }
                }
            });

        });
    }
});
