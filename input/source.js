let result = c(5, 12);

function a(b, c) {
    return b + c;
}
let b = function(d, e) {
    return a(d, e);
}
let c = function(f, g) {
    return b(f, g);
}