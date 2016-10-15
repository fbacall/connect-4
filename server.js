var Game = require('./game.js');
var Room = require('./room.js');
var GeohashMap = require('./geohash_map.js');

var sanitizer = require('sanitizer');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var rooms = { debug: new Room('debug', new Game(7, 6)),
              debug2: new Room('debug2', new Game(9, 9, 5))};
var geohashMap = new GeohashMap();

// Results
var results = [];
var RESULTS_FILE = 'results.json';

try {
    console.log('Reading results file...');
    var file = fs.readFileSync(RESULTS_FILE);
    results = JSON.parse(file);
}
catch (e) {
    if (e instanceof Error && e.code == 'ENOENT') {
        console.log('No ' + RESULTS_FILE + ' file found!')
    } else {
        throw e;
    }
}

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/game', function (req, res) {
    // Generate a unique ID
    var id;
    do {
        id = Math.random().toString(36).substr(2, 9);
    } while (typeof rooms[id] !== 'undefined');

    var cols = constrain(req.body.cols, 7, 4, 10);
    var rows = constrain(req.body.rows, 6, 4, 10);
    var toWin = constrain(req.body.toWin, 4, 3, 7);

    rooms[id] = new Room(id, new Game(cols, rows, toWin));
    console.log('Created new room:', id,
        '( cols: ', cols, ', rows: ', rows, ' to win: ', toWin, ')');

    if (req.body.geohash) {
        rooms[id].geohash = req.body.geohash;
        geohashMap.add(req.body.geohash, rooms[id]);
        console.log('  with geohash:', req.body.geohash);
    }
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

app.get('/games/:geohash', function (req, res) {
    var list = geohashMap.nearest(req.params.geohash, 10).map(function (room) {
        return { id: room.id, game: room.game };
    });

    res.send(list);
});

app.get('/results', function (req, res) {
    res.send(results.slice(-10));
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});

io.on('connection', function(socket){
    var roomId = socket.handshake.query.id;
    var name = sanitizer.sanitize(socket.handshake.query.name).substr(0,30);
    if (name.replace(/ /g,'') === '') {
        name = 'anon';
    }
    console.log(name + ' connected');
    var room = rooms[roomId];
    var player = { name: name };
    socket.player = player;

    if (room) {
        var game = room.game;

        if (!(game.player1 && game.player2)) {
            game.addPlayer(player);
            socket.emit('player-number', player.number);

            socket.on('place-token', function(column) {
                if (game.turn === player) {
                    game.placeToken(column);
                    if (game.state === 'won') {
                        room.status(game.winner, 'wins!');
                        pushResult({ winner: game.winner, loser: game.loser, board: game.board, winning: game.winning, columns: game.columns, rows: game.rows  });
                    } else if (game.state === 'draw') {
                        pushResult({ draw: true, winner: game.player1, loser: game.player2, board: game.board, columns: game.columns, rows: game.rows });
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


function sweepRoom(room, timer) {
    console.log('Starting delete timer for room:', room.id);
    room.sweeper = setTimeout(function () {
        console.log('Deleting empty room:', room.id);
        delete rooms[room.id];
        if (room.geohash) {
            geohashMap.remove(room.geohash, room);
        }
    }, timer);
}

function pushResult(result) {
    results.push(result);
    fs.writeFile(RESULTS_FILE, JSON.stringify(results));
}

function constrain(value, defaultValue, min, max) {
    if (!value)
        return defaultValue;
    else if (value > max)
        return max;
    else if (value < min)
        return min;
    else
        return value;
}
