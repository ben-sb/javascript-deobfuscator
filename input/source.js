function proxy1(a, b) {
    return a + b;
}
function proxyForProxy1(a, b) {
    return proxy1(a, b);
}
function proxy2(a, b) {
    return a - b;
}
function proxyForProxy2(a, b) {
    return proxy2(a, b);
}

var a = proxyForProxy1(8 * 13 - 3 + 1, 2 ** 2 - 13 + 82) + proxyForProxy2(293 - 231, 2 * 6 -2);