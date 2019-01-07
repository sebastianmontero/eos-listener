const { EventEmitter } = require('events');

class Lock {
    constructor(size = 1) {
        this._size = size;
        this._count = size;
        this._ee = new EventEmitter();
    }

    acquire() {
        return new Promise(resolve => {
            // If nobody has the lock, take it and resolve immediately
            if (this.canAcquire()) {
                // Safe because JS doesn't interrupt you on synchronous operations,
                // so no need for compare-and-swap or anything like that.
                this._count--;
                return resolve();
            }

            // Otherwise, wait until somebody releases the lock and try again
            const tryAcquire = () => {
                if (this.canAcquire()) {
                    this._count--;
                    this._ee.removeListener('release', tryAcquire);
                    return resolve();
                }
            };
            this._ee.on('release', tryAcquire);
        });
    }

    canAcquire() {
        return this._count > 0;
    }

    release() {
        // Release the lock immediately
        this._count++;
        setImmediate(() => this._ee.emit('release'));
    }

    isInUse() {
        return this._count < this._size;
    }
}

module.exports = Lock;