[
    '\x1b[35m',
    '  __ _       _____   ____ _ ',
    ' / _` |_____/ __\\ \\ / / _` |',
    '| (_| |_____\\__ \\\\ V / (_| |',
    ' \\__,_|     |___/ \\_/ \\__, |',
    '                      |___/ ',
    '',
    '\x1b[33m  Installing Flash ASVG command into Adobe Animate',
    '',
    '\x1b[31m  On request select "Run as command"',
    '',
    '\x1b[32m  After this you will have a new [ASVG] command in the Commands menu',
    '\x1b[0m'
].forEach((_, i) => {
    setTimeout(() => {
        console.log(_);
    }, (100 - i * 3) * i);
});

setTimeout(() => {
    require('opn')('asvg.jsfl', { wait: false });
}, 5000);
