---
name: git-worktree-pr
description: Make requested changes to a Git repository in an isolated worktree and reviewable branch, then open a pull request when a remote is available. Use for implementation, fixes, refactors, or documentation edits in repositories; do not use for read-only inspection.
---

# Git Worktree PR

Keep the user's primary checkout untouched and make each change reviewable.

## Workflow

1. Inspect the repository root, current status, remotes, default branch, and existing worktrees before editing.
2. Preserve all existing changes. Never move, discard, reset, or include unrelated work.
3. If the task is already running in a dedicated worktree and branch, use it. Otherwise create a sibling worktree from the appropriate base branch with a short `codex/<task-slug>` branch name.
4. Make all requested file changes inside that worktree. Keep generated artifacts, credentials, personal data, databases, dependency folders, and build output out of commits unless the user explicitly requests and the repository policy permits them.
5. Run checks proportional to the change. Summarize any checks that cannot run instead of hiding them.
6. Review the diff, commit only the intended files with a descriptive message, and push the branch when the repository has a usable remote and authentication.
7. Open a pull request with a concise description and test evidence. Attach the pull request to the current Codex task after creation. Do not merge it unless the user separately asks.

## Boundaries

- Do not create nested worktrees when the current checkout is already an isolated task worktree.
- Do not assume permission to publish a private repository publicly. Default new repositories to private when visibility is unspecified.
- Do not put files larger than Git hosting limits into ordinary commits. Use a release asset or another artifact store when the user requests distribution binaries.
- If repository creation, authentication, or a missing remote blocks publication, finish and commit the branch locally, report the exact blocker, and request only the minimum user action needed.
- Leave the worktree available while its pull request is open so follow-up review changes can be made on the same branch.
