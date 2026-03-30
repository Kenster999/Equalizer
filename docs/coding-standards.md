# Coding Standards

These standards apply to all code in the project.

---

### 1. Blank Lines Between Functions
Put two blank lines between top-level functions. This does not apply inside class bodies.

### 2. Trailing Newlines
All source files must end with exactly 3 newline characters: one closing the last line of code, plus two more. This results in two blank lines visible at EOF.

### 3. Allman Style for Top-Level Named Blocks
Place the opening brace for `function` and `class` declarations on its own line,
immediately after the declaration line, with nothing else on that line. The closing
`}` also goes on its own line (followed only by the Rule 4 closing brace comment).
The function body is always expanded: one statement per line, indented — never
collapsed onto the same line as either brace.

Not applied to other block types (e.g. `if`, `for`, `try`) — see Rules 5 and 7.

Correct:
```javascript
function someFunc(a, b)
{
  doSomething();
  return result;
}  // function someFunc(a, b)
```

Incorrect:
```javascript
// Opening brace on declaration line:
function someFunc(a, b) {
  doSomething();
}  // function someFunc(a, b)

// Body collapsed onto brace line:
function someFunc(a, b)
{ doSomething(); return result; }  // function someFunc(a, b)
```

### 4. Closing Brace Comment
Each function must have a comment immediately after its closing `}`, separated by two spaces, repeating the function signature. If the declaration spans multiple lines, concatenate it into a single line for the comment.

Example:
```javascript
function someFunc(a, b)
{
  // do something
}  // function someFunc(a, b)
```

### 5. Braces for If/Else
All `if`, `else if`, and `else` blocks must use braces, even if the block contains only one line.

### 6. Code Grouping and Ordering
Group related code together using comment headers. Within each group:
- Constants and non-function declarations come first, in alphabetical order where possible
- Functions follow, in alphabetical order

Put exactly 3 blank lines both before AND after each group header comment. This
means the last function before a header and the first function (or declaration)
after a header are each separated from the header by 3 blank lines.

Example:
```javascript
}  // function lastFuncInGroup



// --- Next Group ---



const SOME_CONSTANT = 1;


function aFunc()
{
  // ...
}  // function aFunc()


function bFunc()
{
  // ...
}  // function bFunc()
```

### 7. Brace Style for If/Else
For `if`, `else if`, and `else` blocks, place the opening brace at the end of the
keyword line (K&R style). Nothing else appears on that line after the `{`. The
closing `}` goes on its own line. The block body is always expanded: one statement
per line, indented — never collapsed onto the same line as either brace. This
applies even when the block contains only one statement.

Correct:
```javascript
if (x > 0) {
  return x;
}

if (!valid) {
  return null;
} else if (x === 0) {
  doSomething();
} else {
  return -1;
}
```

Incorrect:
```javascript
// Body collapsed onto opening brace line:
if (x > 0) { return x; }

// Opening brace on its own line (Allman — wrong for if/else):
if (x > 0)
{
  return x;
}

// Body collapsed onto closing brace line:
if (x > 0) {
  return x; }
```
