var Connect4 = require('./connect4.js');
var Room = require('./room.js');
var GeohashMap = require('./geohash_map.js');

var Sanitizer = require('sanitizer');
var Express = require('express');
var BodyParser = require('body-parser');
var app = Express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

const port = parseInt(process.argv[2] || '3000');
const rooms = { debug: new Room('debug', new Connect4(7, 6)),
    debug2: new Room('debug2', new Connect4(9, 9, 5))};
const geohashMap = new GeohashMap();

// Results
let results = [];
const RESULTS_FILE = 'results.json';

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

app.use(Express.static('public'));
app.use(BodyParser.urlencoded({ extended: true }));

app.post('/game', function (req, res) {
    // Generate a unique ID
    let id;
    do {
        id = Math.random().toString(36).substr(2, 9);
    } while (typeof rooms[id] !== 'undefined');

    let cols = constrain(req.body.cols, 7, 4, 10);
    let rows = constrain(req.body.rows, 6, 4, 10);
    let toWin = constrain(parseInt(req.body.toWin), 4, 3, 7);

    rooms[id] = new Room(id, new Connect4(cols, rows, toWin));
    console.log('Created new room:', id,
        '( cols: ', cols, ', rows: ', rows, ' to win: ', toWin, ')');

    if (req.body.geohash) {
        rooms[id].geohash = req.body.geohash;
        geohashMap.add(req.body.geohash, rooms[id]);
        console.log('  with geohash:', req.body.geohash);
    }
    sweepRoom(rooms[id], 10 * 60 * 1000);

    res.redirect('game/' + id);
});

app.get('/game/:id', function (req, res) {
    if (rooms[req.params.id]) {
        res.sendFile(__dirname + '/public/game.html');
    } else {
        res.status(404).send('Invalid game ID');
    }
});

app.get('/games/:geohash', function (req, res) {
    res.send(
        geohashMap.nearest(req.params.geohash, 10).map(function (room) {
        return { id: room.id, game: room.game };
    }));
});

app.get('/results', function (req, res) {
    res.send(results.slice(-10));
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});

io.on('connection', function(socket) {
    console.log('New connection');
    let room;
    let name;
    let game;
    let player;

    socket.on('join', function (data) {
        let roomId = data.id;
        let name = Sanitizer.sanitize(data.name).substr(0,30);
        if (name.replace(/ /g,'') === '') {
            name = 'anon';
        }
        console.log(name + ' joined room ' + roomId);
        room = rooms[roomId];
        player = { name: name };
        socket.player = player;

        if (room) {
            game = room.game;

            if (!(game.player1 && game.player2)) {
                game.addPlayer(player);
                socket.emit('player-number', player.number);

                socket.on('place-token', function (column) {
                    if (game.turn === player) {
                        game.placeToken(column);
                        room.broadcast('place-token', { column: column, player: player, turn: game.turn });

                        if (game.state === 'won') {
                            room.status(game.winner, 'wins!');
                            pushResult({ winner: game.winner, loser: game.loser, board: game.board, winning: game.winning, columns: game.columns, rows: game.rows  });
                            room.sync();
                        } else if (game.state === 'draw') {
                            pushResult({ draw: true, winner: game.player1, loser: game.player2, board: game.board, columns: game.columns, rows: game.rows });
                            room.sync();
                        }
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
    });

    socket.on('disconnect', function(){
        console.log((name || 'anonymous user') + ' disconnected');
        if (room) {
            room.leave(socket);
            game.removePlayer(player);
            room.sync();
            if (!room.sockets.length) {
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
