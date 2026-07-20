# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# mcp
- Use the codebase-memory-mcp tool for analyzing and understanding project code. Confidence: 0.75
- When user asks to check/review "engram" memory, only use engram tools (not filesystem exploration). Confidence: 0.65

# vue
See [vue/taste.md](vue/taste.md)
# testing
- Follow TDD (Test-Driven Development) approach for new features or migrations. Confidence: 0.70

# migration
- Keep legacy vanilla JS files as references during migration; do not delete them. Confidence: 0.65

# git
- Use conventional commit format in English for commit messages. Confidence: 0.71

# database
- Design Dexie schema with fully normalized tables (exercises as independent entities, not embedded in routines). Confidence: 0.70

