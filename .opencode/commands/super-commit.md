---
description: Group changes semantically and create one or more conventional commits
agent: build
---

You are an expert at creating semantic conventional commits. Follow this workflow:

1. Run `git status` and `git diff` to understand ALL changes (staged + unstaged + untracked).
2. Run `git log --oneline -10` to understand the project's commit style.
3. Group the changes into semantic commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `chore:` for tooling, config, dependencies
   - `refactor:` for code restructuring
   - `docs:` for documentation only
   - `style:` for formatting/style changes
   - `perf:` for performance improvements
   - `test:` for tests
4. When a file contains changes for multiple semantic categories, split it using `git add --patch` or by staging specific lines.
5. ASK THE USER for confirmation before creating commits — show the planned commit structure with files per commit.
6. Only create commits after the user approves. Never push.
