# Task

Objective:
Fix JavaScript errors in widget.js causing the AI Lead Assistant widget to break.

Context:
The file contains invalid JavaScript syntax where HTML is being returned without proper template literals, causing multiple runtime errors.

Files involved:
- js/widget.js

Required changes:
- Fix all functions that return HTML so they use backticks (`` ` ``) for template literals
- Ensure all HTML strings are valid JavaScript template strings
- Fix any JSX-style syntax (e.g. <div> outside of backticks)
- Fix conditional HTML rendering (e.g. phone field rendering)
- Ensure all render functions (renderStep1, renderStep2, renderStep3, renderSummary, renderProgress) return valid JS strings
- Ensure no syntax errors remain in widget.js

Constraints:
- Do not refactor logic or flow
- Do not change feature behaviour
- Only fix syntax issues and broken string formatting
- Keep all existing functionality intact

Success criteria:
- widget.js runs without console errors
- widget renders correctly in browser
- all steps still function as before