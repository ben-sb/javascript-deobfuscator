let ar = ['\x48\x65\x6c\x6c\x6f', 0x95, '\x20', 0x1a75, '\x57\x6f\x72\x6c\x64', -0x53, '\x6c\x6f\x67']
let a = function(b, c) {
    return c + 2 * b;
}, b = function(c, d) {
    return a(c, d);
}, c = function(d, e) {
    return b(d, e);
};
let message = ar[0] + ar[2] + ar[4];
let result = c(ar[1] * 0x38 + ar[3] + 0x619, 0x12 * ar[5] + 0x1a13 + 0x621);
console[ar[6]](message + result);