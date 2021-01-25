# General purpose JavaScript Deobfuscator

A deobfuscator to remove common JavaScript obfuscation techniques.<br/>

### Features
* Unpacks arrays containing literals (strings, numbers etc) and replaces all references to them
* Removes simple proxy functions (calls to another function) and arithmetic proxy functions (binary expressions)
* Simplifies arithmetic expressions
* Simplifies string concatenation
* Converts computed to static member expressions and beautifies the code


## Array Unpacking
### Before
```javascript
let a = [' ', 'World', 'Hello'];

console.log(a[2] + a[0] + a[1]);
```

### After
```javascript
console.log("Hello" + " " + "World");
```

## Expression Simplification
### An example with numbers.

### Before
```javascript
let total = 0x2 * 0x109e + -0xc * -0x16a + -0x3234;
for (let i = 0x1196 + 0x97b * 0x3 + -0x2e07; i < -0x95 * -0x38 + -0x1a75 + -0x619; i++) {
    total += i;
}
```

### After
```javascript
let total = 0;
for (let i = 0; i < 10; i++) {
    total += i;
}
```
<br/>

### An example with strings.

### Before
```javascript
console.log('He' + 'll' + 'o' + ' Wo' + 'r' + 'ld');
```

### After
```javascript
console.log("Hello World");
```


## To Run
Put the obfuscated script in input/source.js and run:<br/>
**npm start**