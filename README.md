# General purpose JavaScript deobfuscator

A simple but powerful deobfuscator to remove common JavaScript obfuscation techniques. May host on a website for ease of use in the future.<br/>
Open an issue if there is a feature you think should be implemented.

## Features
* Unpacks arrays containing literals (strings, numbers etc) and replaces all references to them
* Removes simple proxy functions (calls to another function), array proxy functions and arithmetic proxy functions (binary expressions)
* Simplifies arithmetic expressions
* Simplifies string concatenation
* Converts computed to static member expressions and beautifies the code


## Examples
See bottom for more complicated example with features chained together.

### Array Unpacking
Before
```javascript
let a = ['\x20', '\x57\x6f\x72\x6c\x64', '\x48\x65\x6c\x6c\x6f'];

console.log(a[2] + a[0] + a[1]);
```

After
```javascript
console.log("Hello" + " " + "World");
```

<br/>

### Proxy Functions
#### An example with simple proxy functions for other functions

Before
```javascript
function a(b, c) {
    return someFunction(b, c);
}

let result = a(5, 6);
```

After
```javascript
let result = someFunction(5, 6);
```

<br/>

#### An example with proxy functions for arithmetic

Before
```javascript
function a(b, c) {
    return c + 2 * b;
}

let result = a(5, 6);
```

After
```javascript
let result = 6 + 2 * 5;
```

<br/>

#### An example with chained proxy functions

Before
```javascript
function a(b, c) {
    return c + 2 * b;
}
function b(c, d) {
    return a(c, d);
}
function c(d, e) {
    return b(d, e);
}

let result = c(5, 6);
```

After
```javascript
let result = 6 + 2 * 6;
```

<br/>

### Expression Simplification
#### An example with numbers

Before
```javascript
let total = 0x2 * 0x109e + -0xc * -0x16a + -0x3234;
for (let i = 0x1196 + 0x97b * 0x3 + -0x2e07; i < -0x95 * -0x38 + -0x1a75 + -0x619; i++) {
    total += i;
}
```

After
```javascript
let total = 0;
for (let i = 0; i < 10; i++) {
    total += i;
}
```
<br/>

#### An example with strings.

Before
```javascript
console.log('He' + 'll' + 'o' + ' Wo' + 'r' + 'ld');
```

After
```javascript
console.log("Hello World");
```

<br/>

### Overall Example
All these features can be chained together to simplify code.

Before
```javascript
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
```

After
```javascript
let message = "Hello World";
let result = 20250;
console.log(message + result);
```


## To Run
Put the obfuscated script in input/source.js and run:<br/>
**npm start**


## Credits
[jsoverson](https://github.com/jsoverson) for the Shift AST and Shift Refactor
