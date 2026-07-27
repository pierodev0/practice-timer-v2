# SDD Skill Registry

Generated: 2026-07-26
Type: user-level only
Notes: No project-level skills found. OpenCode platform uses skills from ~/.config/opencode/skills/ (also symlinked/hardlinked from ~/.claude/skills/).

## User-Level Skills

### ~/.config/opencode/skills/

| Skill | Trigger | Path |
|---|---|---|
| sdd-init | SDD init, openspec init | ~/.config/opencode/skills/sdd-init/SKILL.md |
| sdd-explore | SDD exploration, requirement clarification | ~/.config/opencode/skills/sdd-explore/SKILL.md |
| sdd-propose | SDD proposal, change proposal | ~/.config/opencode/skills/sdd-propose/SKILL.md |
| sdd-spec | SDD spec, delta specs | ~/.config/opencode/skills/sdd-spec/SKILL.md |
| sdd-design | SDD technical design | ~/.config/opencode/skills/sdd-design/SKILL.md |
| sdd-tasks | SDD tasks, task planning | ~/.config/opencode/skills/sdd-tasks/SKILL.md |
| sdd-apply | SDD apply, implementation | ~/.config/opencode/skills/sdd-apply/SKILL.md |
| sdd-verify | SDD verification | ~/.config/opencode/skills/sdd-verify/SKILL.md |
| sdd-archive | SDD archive | ~/.config/opencode/skills/sdd-archive/SKILL.md |
| sdd-onboard | SDD onboarding | ~/.config/opencode/skills/sdd-onboard/SKILL.md |
| skill-registry | Skill registry update | ~/.config/opencode/skills/skill-registry/SKILL.md |
| skill-creator | Skill creation | ~/.config/opencode/skills/skill-creator/SKILL.md |
| skill-improver | Skill improvement, audit | ~/.config/opencode/skills/skill-improver/SKILL.md |
| work-unit-commits | Commit planning, review units | ~/.config/opencode/skills/work-unit-commits/SKILL.md |
| branch-pr | PR creation, review | ~/.config/opencode/skills/branch-pr/SKILL.md |
| chained-pr | Stacked PRs, large PR splitting | ~/.config/opencode/skills/chained-pr/SKILL.md |
| comment-writer | PR comments, review feedback | ~/.config/opencode/skills/comment-writer/SKILL.md |
| cognitive-doc-design | Documentation design | ~/.config/opencode/skills/cognitive-doc-design/SKILL.md |
| issue-creation | Issue creation, bug reports | ~/.config/opencode/skills/issue-creation/SKILL.md |
| judgment-day | Dual review, adversarial review | ~/.config/opencode/skills/judgment-day/SKILL.md |
| go-testing | Go testing patterns | ~/.config/opencode/skills/go-testing/SKILL.md |
| codegraph | CodeGraph CLI reference | ~/.config/opencode/skills/codegraph/SKILL.md |

### ~/.claude/skills/ (additional skills not in opencode)

| Skill | Trigger | Path |
|---|---|---|
| codebase-memory | Codebase knowledge graph queries | ~/.claude/skills/codebase-memory/SKILL.md |

### ~/.agents/skills/

| Skill | Trigger | Path |
|---|---|---|
| codegraph | CodeGraph CLI — symbols, source, callers | ~/.agents/skills/codegraph/SKILL.md |
| agent-browser | Browser automation, UI testing, web scraping | ~/.agents/skills/agent-browser/SKILL.md |

## Project Convention Files

| File | Description |
|---|---|
| AGENTS.md | Project architecture, commands, dev tools configuration |
| .env | VITE_DEBUG=true (default dev mode) |
| vite.config.js | Vitest config, path aliases, plugins |
| jsconfig.json | Strict mode JS config with bundler resolution |

## Configuration Convention

Skills in ~/.config/opencode/skills/ are the active SDD skillset for this platform (OpenCode). The ~/.claude/skills/ and ~/.agents/skills/ directories serve other platforms and are cross-referenced for completeness.
