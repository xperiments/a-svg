import * as fs from 'fs';
export const walkSync = (dir: string, filelist: string[] = []) => {
    if (dir[dir.length - 1] !== '/') {
        dir = dir.concat('/');
    }
    const files = fs.readdirSync(dir);
    files.forEach((file: string) => {
        if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
        } else {
            filelist.push(dir + file);
        }
    });
    return filelist;
};

export function djb2Code(str: string): number {
    //http://erlycoder.com/49/javascript-hash-functions-to-convert-string-into-integer-hash-
    var hash = 0;
    if (str.length == 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

export function parseCommandArguments(arr: string[]): { [key: string]: any } {
    return arr.reduce(
        (
            prevValue: { [key: string]: string },
            valorActual: string,
            index: number,
            vector: string[]
        ) => {
            if (index % 2 == 0) {
                prevValue[vector[index].replace(/-/gi, '')] = arr[index + 1];
                return prevValue;
            }
            return prevValue;
        },
        {}
    );
}

export function padEnd(
    str: string,
    targetLength: number,
    padString: string = ' '
) {
    targetLength = targetLength >> 0; //floor if number or convert non-number to 0;
    if (str.length > targetLength) {
        return String(str);
    } else {
        targetLength = targetLength - str.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
        }
        return String(str) + padString.slice(0, targetLength);
    }
}
