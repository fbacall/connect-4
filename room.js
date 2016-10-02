function Room (id, game) {
    this.id = id;
    this.game = game;
    this.sockets = [];
}

Room.prototype.join = function (socket) {
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
    this.broadcast('chat-message', { player: player, message: escapeHtml(msg) });
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

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

exports.Room = Room;
