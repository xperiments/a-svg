function log(...args: any[]): boolean {
    console.log(
        '[\x1b[36ma-svg',
        '\x1b[35m' + args.join('\x1b[0m\x1b[35m'),
        '\x1b[0m]'
    );
    return false;
}
function warn(...args: any[]): boolean {
    console.log('[a-svg]', ...args);
    return false;
}
function error(...args: any[]): boolean {
    console.log('\x1b[31m[a-svg', ...args, ']\x1b[0m');
    return false;
}
export const logger = {
    log,
    warn,
    error
};
