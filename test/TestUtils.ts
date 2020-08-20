function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomChar() {
    return Math.random() > 0.5 ? String.fromCharCode(randomInt(65, 90)) : String.fromCharCode(randomInt(97, 122));
}

export function randomWord(length: number = 10) {
    return new Array(length).fill('').map(c => randomChar()).join('');
}

export function randomWords(count: number = 5, length_min: number = 10, length_max?: number) {
    return times(count, () => randomWord(randomInt(length_min, length_max || length_min))).join(' ');
}

function times(n: number, callback: (i: number) => void): any[] {

    if(isNaN(n) || !isFinite(n) || n <= 0) {
        return [];
    }

    const result: any[] = [];

    for(let i = 0; i < n; i++){
        result.push(callback(i));
    }

    return result;
}