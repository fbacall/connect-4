var sanitizer = require('sanitizer');

function Room (id, game) {
    this.id = id;
    this.game = game;
    this.sockets = [];
}

Room.prototype.join = function (socket) {
    this.setUniqueName(socket.player);
    this.sockets.push(socket);
    this.status(socket.player, 'joined');
};

Room.prototype.leave = function (socket) {
    var index = this.sockets.indexOf(socket);

    if (index !== -1) {
        this.sockets.splice(index, 1);
        this.status(socket.player, 'left');
    }
};

Room.prototype.chat = function (player, msg) {
    this.broadcast('chat-message', { player: player, message: sanitizer.sanitize(msg).substr(0, 255) });
};

Room.prototype.status = function (player, msg) {
    this.broadcast('chat-status', { player: player, message: msg });
};

Room.prototype.sync = function () {
    var state = this.game.getState();
    state.connected = this.sockets.length;
    this.broadcast('state', state);
};

Room.prototype.broadcast = function (key, data) {
    this.sockets.forEach(function (socket) {
        socket.emit(key, data);
    });
};

Room.prototype.setUniqueName = function (player) {
    var suggestedName = player.name;
    var unique = false;
    var index = 2;
    do {
        this.sockets.forEach(function (socket) {
            if (socket.player.name === suggestedName) {
                suggestedName = player.name + ' (' + index + ')';
                index++;
            }
        });
        unique = true;
    } while (!unique);

    player.name = suggestedName;
};

module.exports = Room;
