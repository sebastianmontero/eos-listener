
const straw = require('@smontero/straw');


class BaseTopolgy {

    constructor(prefix, {
        config,
        purge = false,
        redis,
    }) {
        redis = redis || {};
        this.opts = {
            nodes_dir: __dirname + '/nodes',
            redis: {
                host: '127.0.0.1',
                port: 6379,
                prefix,
                ...redis
            },
        };
        this.purge = purge;
        this.config = config;
    }

    async start() {
        await this._create(await this.getNodes(), this.opts);
    }

    async getNodes() {
        //Base class must override this method
    }

    _create(nodes, opts) {
        var topo = straw.create(opts);
        topo.add(nodes, () => {
            topo.start({ purge: this.purge });
        });

        var destroyFn = function () {
            console.log('Destroying topoplogy.');
            topo.destroy(function () {
                console.log('Finished.');
            });
        }
        process.on('SIGINT', destroyFn);
        process.on('SIGTERM', destroyFn);

        this.topology = topo;
    }
}

module.exports = BaseTopolgy;

