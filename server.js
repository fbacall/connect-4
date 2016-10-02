var Game = require('./game.js').Game;
var Room = require('./room.js').Room;

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rooms = { debug: new Room(new Game(7,6)) };

app.use(express.static('public'));

app.post('/game', function (req, res) {
    // Generate a unique ID
    var id;
    do {
        id = Math.random().toString(36).substr(2, 9);
    } while (typeof rooms[id] !== 'undefined');

    rooms[id] = new Room(new Game(7,6));
    console.log('Created new game', id);

    res.redirect('/game/' + id);
});

app.get('/game/:id', function (req, res) {
    if (rooms[req.params.id]) {
        res.sendFile(__dirname + '/public/game.html');
    } else {
        res.status(404).send('Invalid game ID');
    }
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});

io.on('connection', function(socket){
    console.log('a user connected');
    var roomId = socket.handshake.query.id;
    var name = socket.handshake.query.name;
    var room = rooms[roomId];
    var player = { name: name };
    socket.player = player;

    if (room) {
        var game = room.game;

        if (player.name.replace(/ /g,'') === '') {
            player.name = 'anon-' + (room.sockets.length + 1);
        }

        room.join(socket);

        if (game.player1 && game.player2) {
            console.log("Game is full!");
            socket.emit('state', game.getState());
        } else {
            game.addPlayer(player);
            socket.emit('player-number', player.number);

            socket.on('place-token', function(column) {
                if (game.turn === player) {
                    game.placeToken(column);
                    room.sync();
                }
            });
        }
        room.sync();

        socket.on('chat-message', function (msg) {
            room.chat(player, msg);
        });

    } else {
        socket.emit('game-closed');
    }

    socket.on('disconnect', function(){
        console.log('user disconnected');
        if (room) {
            room.leave(socket);
            game.removePlayer(player);
            room.sync();
        }
    });
});
