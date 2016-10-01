var g = require('./game.js');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var games = { 1: new g.Game(7,6)};

app.use(express.static('public'));

app.post('/game', function (req, res) {
    // Generate a unique ID
    var id;
    do {
        id = Math.random().toString(36).substr(2, 9);
    } while (typeof games[id] !== 'undefined');

    games[id] = new g.Game(7,6);
    console.log('Created new game', id);

    res.redirect('/game/' + id);
});

app.get('/game/:id', function (req, res) {
    if (games[req.params.id]) {
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
    var gameId = socket.handshake.query.game;
    var name = socket.handshake.query.name;
    var game = games[gameId];
    var player = null;

    if (game) {
        game.sockets.push(socket);

        if (game.player1 && game.player2) {
            console.log("Game is full!");
            socket.emit('state', game.getState());
        } else {
            player = game.addPlayer({ name: name });
            console.log(player);
            socket.emit('player-number', player.number);
            game.broadcast('state', game.getState());

            socket.on('place-token', function(column) {
                if (game.turn === player) {
                    game.placeToken(column);
                    game.broadcast('state', game.getState());
                }
            });
        }

    } else {
        console.log('No Game!');
    }

    socket.on('disconnect', function(){
        console.log('user disconnected');
        if (game) {
            game.sockets.splice(game.sockets.indexOf(socket), 1);
            if (player) {
                game.removePlayer(player);
            }
        }
    });
});
