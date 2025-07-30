# Test Comment System

This is a test file to verify that the comment system works correctly.

## Features to Test

1. **Loading clean content**: The editor should show only this markdown content, not any embedded comments
2. **Adding comments**: Users should be able to add comments below the editor
3. **Viewing comments**: Comments should be visible in both edit and view modes
4. **Comment persistence**: Comments should be saved to the markdown file but not visible in the editor

## Sample Content

Here's some sample markdown content:

- Item 1
- Item 2
- Item 3

```javascript
// Code example
function testComments() {
  console.log("Testing comment system");
}
```

> This is a blockquote to test various markdown elements.

**Bold text** and *italic text* should render properly in both the editor and when comments are present.

<!-- COMMENTS_DATA_START
{
  "comments": [
    {
      "id": "comment_mdqapc7e_iy9zmlrxi",
      "author": "admin",
      "content": "I love this",
      "timestamp": "2025-07-30T18:24:39.434Z",
      "createdAt": "2025-07-30T18:24:39.434Z"
    }
  ],
  "version": "1.0"
}
COMMENTS_DATA_END -->