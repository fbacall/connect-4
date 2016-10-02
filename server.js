var Game = require('./game.js');
var Room = require('./room.js');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rooms = { debug: new Room('debug', new Game(7,6)) };
var results = [];

app.use(express.static('public'));

app.post('/game', function (req, res) {
    // Generate a unique ID
    var id;
    do {
        id = Math.random().toString(36).substr(2, 9);
    } while (typeof rooms[id] !== 'undefined');

    rooms[id] = new Room(id, new Game(7,6));
    console.log('Created new room:', id);
    sweepRoom(rooms[id], 10 * 60 * 1000);

    res.redirect('/game/' + id);
});

app.get('/game/:id', function (req, res) {
    if (rooms[req.params.id]) {
        res.sendFile(__dirname + '/public/game.html');
    } else {
        res.status(404).send('Invalid game ID');
    }
});

app.get('/results', function (req, res) {
    res.send(results.slice(-10));
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});

function sweepRoom(room, timer) {
    console.log('Starting delete timer for room:', room.id);
    room.sweeper = setTimeout(function () {
        console.log('Deleting empty room:', room.id);
        delete rooms[room.id];
    }, timer);
}

io.on('connection', function(socket){
    var roomId = socket.handshake.query.id;
    var name = socket.handshake.query.name;
    console.log((name || 'anonymous user') + ' connected');
    var room = rooms[roomId];
    var player = { name: name };
    socket.player = player;

    if (room) {
        var game = room.game;

        if (player.name.replace(/ /g,'') === '') {
            player.name = 'anon-' + (room.sockets.length + 1);
        }

        if (game.player1 && game.player2) {
        } else {
            game.addPlayer(player);
            socket.emit('player-number', player.number);

            socket.on('place-token', function(column) {
                if (game.turn === player) {
                    game.placeToken(column);
                    if (game.state === 'won') {
                        room.status(game.winner, 'wins!');
                        results.push({ winner: game.winner, loser: game.loser, board: game.board, winning: game.winning });
                    } else if (game.state === 'draw') {
                        results.push({ draw: true, winner: game.player1, loser: game.player2, board: game.board });
                    }
                    room.sync();
                }
            });
        }

        room.join(socket);
        if (room.sweeper) {
            console.log('Cancelling delete timer for room:', room.id);
            clearTimeout(room.sweeper);
            delete room.sweeper;
        }
        room.sync();

        socket.on('chat-message', function (msg) {
            room.chat(player, msg);
        });

    } else {
        socket.emit('game-closed');
    }

    socket.on('disconnect', function(){
        console.log((name || 'anonymous user') + ' disconnected');
        if (room) {
            room.leave(socket);
            game.removePlayer(player);
            room.sync();
            if (room.sockets.length == 0) {
                sweepRoom(room, 10 * 60 * 1000);
            }
        }
    });
});
