const Lock = require('./lock/Lock');

const lock1 = new Lock();
const lock2 = new Lock();

async function operation1() {
    console.log("Execute operation1");
    await lock1.acquire();
    setTimeout(function () {
        console.log("lock1 Done");
        lock1.release();
        console.log("lock1 Released");
    }, 3000);
}

async function operation2() {
    console.log("Execute operation2");
    await lock1.acquire();
    setTimeout(function () {
        console.log("lock2 Done");
        lock1.release();
        console.log("lock2 Released");
    }, 3000);
}

async function operation3() {
    console.log("Execute operation3");
    await lock1.acquire();
    setTimeout(function () {
        console.log("lock3 Done");
        lock1.release();
        console.log("lock3 Released");
    }, 3000);
}

async function operation4() {
    console.log("Execute operation4");
    await lock2.acquire();
    setTimeout(function () {
        console.log("lock4 Done");
        lock2.release();
        console.log("lock4 Released");
    }, 3000);
}

async function operation5() {
    console.log("Execute operation5");
    await lock2.acquire();
    setTimeout(function () {
        console.log("lock5 Done");
        lock2.release();
        console.log("lock5 Released");
    }, 3000);
}

operation1();
operation2();
operation3();
operation4();
operation5();