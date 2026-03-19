# Coding Standards

These standards apply to all code in the project.

---

### 1. Blank Lines Between Functions
Put two blank lines between top-level functions. This does not apply inside class bodies.

### 2. Trailing Newlines
All source files must end with exactly 3 newline characters: one closing the last line of code, plus two more. This results in two blank lines visible at EOF.

### 3. Allman Style for Top-Level Named Blocks
Place the opening brace for `function` and `class` declarations on the line following the declaration.

Not applied automatically to other block types (e.g. `if`, `for`, `try`), except manually when blocks are deeply nested.

### 4. Closing Brace Comment
Each function must have a comment immediately after its closing `}`, separated by two spaces, repeating the function signature. If the declaration spans multiple lines, concatenate it into a single line for the comment.

Example:
```javascript
function someFunc(a, b)
{
  // do something
}  // function someFunc(a, b)
```
