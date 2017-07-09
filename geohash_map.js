class GeohashMap {
    constructor () {
        this.hash = {};
    }

    add (geohash, object) {
        for (let i = geohash.length; i > 0; i--) {
            const fragment = geohash.substr(0, i);
            if (!this.hash[fragment]) {
                this.hash[fragment] = [];
            }

            this.hash[fragment].push(object);
        }
    };

    remove (geohash, object) {
        for (let i = geohash.length; i > 0; i--) {
            const fragment = geohash.substr(0, i);
            if (this.hash[fragment]) {
                const index = this.hash[fragment].indexOf(object);

                if (index !== -1) {
                    this.hash[fragment].splice(index, 1);
                }
            }
        }
    };

    nearest (geohash, limit) {
        const found = [];
        for (let i = geohash.length; i > 0; i--) {
            const fragment = geohash.substr(0, i);
            if (this.hash[fragment]) {
                let j = this.hash[fragment].length - 1;
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
}

// const g = new GeohashMap();
// g.add('gcw234fg', 'finn');
// g.add('gcw234fm', 'mike');
// g.add('gcw295ab', 'dave');
// g.add('gcx295ab', 'steve');
// console.log(g.nearest('gcw234fg', 5));
// console.log(g.nearest('gcw234fg', 3));
// console.log(g.nearest('gcw234fg', 2));
// console.log(g.nearest('gcw234fg', 1));

module.exports = GeohashMap;
