# Ashmit — Part 04: Authentication and request protection

Day 4 of 10. See the package README_FIRST.md before uploading.

Copy the contents of this part's source/ into the project root after pulling the previous teammate's push. Preserve original relative paths and existing directories. This part is incremental and may depend on later parts.

Files:

- `server/src/middleware/auth.js`
- `server/src/middleware/rbac.js`
- `server/src/middleware/errorHandler.js`
- `server/src/middleware/rateLimit.js`
- `server/src/controllers/auth.controller.js`
- `server/src/routes/auth.routes.js`

Suggested commands after copying (from the project root):

```sh
git add -- server/src/middleware/auth.js server/src/middleware/rbac.js server/src/middleware/errorHandler.js server/src/middleware/rateLimit.js server/src/controllers/auth.controller.js server/src/routes/auth.routes.js
git diff --cached --stat
git commit -m 'chore: import ashmit part 04 - authentication and request protection'
git push origin main
```
