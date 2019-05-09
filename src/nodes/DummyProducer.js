const straw = require('@smontero/straw');

module.exports = straw.node({
    initialize: async function (opts, done) {
        this.id = opts.id;
        this.redis = opts.redis.client;
        this.value = 0;
        done();
    },
    start: function (done) {
        console.log('starting Dummy Producer');
        this.redis.get(this.id, (err, reply) => {
            if (err) {
                console.log('Error getting value');
                done(true);
                return;
            }
            this.value = reply || 0;
            this.produce();
            done(false);
        });

    },
    produce: function () {
        setTimeout(() => {
            this.output(this.value);
            this.value++;
            this.produce();
        }, 500);
    },
    stop: function (done) {
        console.log('stopping Dummy Producer', this.id);
        this.redis.set(this.id, this.value, (err) => {
            if (err) {
                console.log('Error setting value');
                done(true);
                return;
            }
            done(false);
        });
    }
});

