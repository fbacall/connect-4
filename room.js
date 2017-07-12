const sanitizer = require('sanitizer');

class Room {
    constructor (id, game) {
        this.id = id;
        this.game = game;
        this.sockets = [];
    }

    join (socket) {
        this.setUniqueName(socket.player);
        this.sockets.push(socket);
        this.status(socket.player, 'joined');
    };

    leave (socket) {
        const index = this.sockets.indexOf(socket);

        if (index !== -1) {
            this.sockets.splice(index, 1);
            this.status(socket.player, 'left');
        }
    };

    chat (player, msg) {
        this.broadcast('chat-message', { player: player, message: sanitizer.sanitize(msg).substr(0, 255) });
    };

    status (player, msg) {
        this.broadcast('chat-status', { player: player, message: msg });
    };

    sync () {
        let state = this.game.getState();
        state.connected = this.sockets.length;
        this.broadcast('state', state);
    };

    broadcast (key, data) {
        this.sockets.forEach(function (socket) {
            socket.emit(key, data);
        });
    };

    setUniqueName (player) {
        let suggestedName = player.name;
        let unique = false;
        let index = 2;
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
}

module.exports = Room;
