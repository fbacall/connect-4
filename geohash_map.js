function GeohashMap () {
    this.hash = {};
}

GeohashMap.prototype.add = function (geohash, object) {
    for (var i = geohash.length; i > 0; i--) {
        var fragment = geohash.substr(0, i);
        if (!this.hash[fragment]) {
            this.hash[fragment] = [];
        }

        this.hash[fragment].push(object);
    }
};

GeohashMap.prototype.remove = function (geohash, object) {
    for (var i = geohash.length; i > 0; i--) {
        var fragment = geohash.substr(0, i);
        if (this.hash[fragment]) {
            var index = this.hash[fragment].indexOf(object);

            if (index !== -1) {
                this.hash[fragment].splice(index, 1);
            }
        }
    }
};

GeohashMap.prototype.nearest = function (geohash, limit) {
    var found = [];
    for (var i = geohash.length; i > 0; i--) {
        var fragment = geohash.substr(0, i);
        if (this.hash[fragment]) {
            var j = this.hash[fragment].length - 1;
            while (j >= 0 && found.length < limit) {
                if (found.indexOf(this.hash[fragment][j]) === -1) {
                    found.push(this.hash[fragment][j]);
                }
                j--;
            }
        }
    }

    return found;
};

// var g = new GeohashMap();
// g.add('gcw234fg', 'finn');
// g.add('gcw234fm', 'mike');
// g.add('gcw295ab', 'dave');
// g.add('gcx295ab', 'steve');
// console.log(g.nearest('gcw234fg', 5));
// console.log(g.nearest('gcw234fg', 3));
// console.log(g.nearest('gcw234fg', 2));
// console.log(g.nearest('gcw234fg', 1));

module.exports = GeohashMap;
