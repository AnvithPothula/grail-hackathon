---
name: grail-hackathon-submit
description: Submit, update, or practice submitting a team's project to the GRAIL hackathon repo (GRAIL-innovationai/grail-hackathon) as a pull request. Use when the user asks to submit, hand in, update, or test-submit their GRAIL hackathon project.
---

# Submit a project to the GRAIL hackathon

You are helping a hackathon team submit their project to https://github.com/GRAIL-innovationai/grail-hackathon. A submission is a pull request that adds the team's source code to `submissions/<event>/<team-slug>/`, with a `README.md` that has three required sections. Work through the steps in order. Commands assume a bash-compatible shell (on Windows, Git Bash).

If the user says this is a test, a practice, or a dry run, follow **Practice run** at the end instead. It never forks, pushes, or opens a pull request.

## Rules

- **Run every command yourself.** Never ask the user to type commands in their own terminal: it may run as a different account that can't see your files or your GitHub login. The user only answers questions and approves things in their browser.
- **Never touch credentials.** Don't print tokens, and never read, copy, or change permissions on credential files such as `~/.config/gh/hosts.yml`. If you can't use an existing login, do your own (Step 0).
- Get the user's go-ahead in Step 2 before you fork, push, or open a pull request, and again on the file list before pushing (Step 7). Don't ask for it before you have the details.
- Only create or change files inside `submissions/<event>/<team-slug>/`. Never edit other teams' folders, files at the repo root, `.github/`, or `scripts/`.
- Never force-push. Never commit secrets. Never invent details, such as a placeholder demo link.
- Your shell may not keep variables, `PATH` changes, or the working directory between commands. In every command, `cd` to the right directory and set the variables it uses (`EVENT`, `SLUG`, `TEAM_NAME`, `PROJECT_DIR`, `WORK_DIR`, `DEST`, `GH_USER`, `GIT_NAME`, `GIT_EMAIL`), or substitute literal values. Use absolute paths.
- Keep commands short and safe to re-run, in case your session is interrupted.
- If a step fails and you can't fix it, stop and tell the user what failed and why.

## Step 0: Check your tools

Do this before asking the user anything, so problems show up early.

1. **git and Python:** `git --version` and `python3 --version` (or `python` / `py`).
2. **GitHub CLI:** `gh --version`. If it's missing and you can't install packages, install it into your home folder. This is for Linux x86_64; for other systems, pick the matching archive from https://github.com/cli/cli/releases/latest.

   ```bash
   V=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p')
   curl -fsSL "https://github.com/cli/cli/releases/download/v${V}/gh_${V}_linux_amd64.tar.gz" | tar -xz -C "$HOME"
   mkdir -p "$HOME/.local/bin" && cp "$HOME/gh_${V}_linux_amd64/bin/gh" "$HOME/.local/bin/gh" && rm -rf "$HOME/gh_${V}_linux_amd64"
   ```

   Then run it as `"$HOME/.local/bin/gh"`, or add `$HOME/.local/bin` to `PATH` in every command. On macOS use `brew install gh`; on Windows, `winget install GitHub.cli`. If `gh` can't be installed at all, follow **Without the GitHub CLI** at the end.
3. **GitHub login:** `gh auth status`. The user may have logged in from their own terminal, but that login may not be visible to you; only what `gh auth status` says in your shell counts. If you aren't logged in, start the browser login yourself, in the background, so you can read its output while it waits:

   ```bash
   nohup gh auth login --hostname github.com --git-protocol https --web </dev/null > "$HOME/gh-login.log" 2>&1 &
   cat "$HOME/gh-login.log"
   ```

   The log shows a one-time code and the link https://github.com/login/device. If it's still empty, read it again after a few seconds. Give the user the code and the link, and ask them to open the link, enter the code, and approve. When they say they're done, run `gh auth status` again. If `GH_TOKEN` is already set in your environment, `gh` uses it and no login is needed.
4. **Let git use that login:** `gh auth setup-git`.
5. **Commit author:** the commit's author name and email become public. By default, use the user's private GitHub address:

   ```bash
   gh api user --jq '"GIT_NAME=\(.name // .login)", "GIT_EMAIL=\(.id)+\(.login)@users.noreply.github.com"'
   ```

   Step 7 passes these to `git -c`, which doesn't change anyone's git settings. Use a different name or email only if the user asks for one.

## Step 1: Gather the details

List the events open for submissions:

```bash
gh api repos/GRAIL-innovationai/grail-hackathon/contents/submissions \
  --jq '.[] | select(.type == "dir" and (.name | startswith("_") | not)) | .name'
```

Without `gh`, run `curl -s https://api.github.com/repos/GRAIL-innovationai/grail-hackathon/contents/submissions` and take the `name` of each entry with `"type": "dir"`, skipping `_template`.

Work out what you can from the project first. Then ask the user for everything you still need **in one message**, offering the events as choices, and have them confirm anything you drafted:

- **Event:** one of the folders listed above.
- **Team name**, and a **team slug** made from it: lowercase letters, digits and single hyphens (`Team Rocket!` → `team-rocket`).
- **Members:** each member's full name and GitHub username.
- **Summary:** one paragraph on what the project does, who it is for, and why it matters. Draft it from the code and let the user edit it.
- **Demo (optional):** ask whether they have a link to a video or slides. If they do, add a `## Demo` section with it; if not, leave the section out. Never use a placeholder link.
- **How to run:** setup and run commands. Derive them from the project (`package.json` scripts, `requirements.txt`, `Makefile`, an existing README) and confirm.
- **Project folder** (`PROJECT_DIR`): the folder with the team's code, usually the current directory. If it isn't a git repo, or it holds more than this project, you'll choose the files with the user in Step 4.

Check that the slug is free:

```bash
gh api "repos/GRAIL-innovationai/grail-hackathon/contents/submissions/$EVENT/$SLUG" --silent 2>/dev/null && echo taken || echo free
```

If it is taken by another team, choose a different slug with the user. If it is this team's own earlier submission, follow **Updating a submission** below instead.

## Step 2: Confirm with the user

Show the user this message, filled in, and wait for an explicit yes:

> Your code will be published **publicly** at github.com/GRAIL-innovationai/grail-hackathon in `submissions/<event>/<team-slug>/`, under the MIT license unless you add your own LICENSE file to that folder. The team members' names and GitHub usernames in the README will also be public, and so will the commit author, `<GIT_NAME> <GIT_EMAIL>`. I will fork the repo to your GitHub account, push a branch, and open a pull request. Public GitHub content can't be fully deleted later. Shall I go ahead?

## Step 3: Fork and clone

Clone the fork into a folder that survives the session: next to the project if you can write there, otherwise your home folder. Don't use `/tmp`, because some environments clear it.

```bash
WORK_DIR="$(dirname "$PROJECT_DIR")"; [ -w "$WORK_DIR" ] || WORK_DIR="$HOME"
cd "$WORK_DIR"
gh repo fork GRAIL-innovationai/grail-hackathon --clone --default-branch-only
cd grail-hackathon
git fetch upstream
git checkout -B "submit/$EVENT/$SLUG" upstream/main
```

From here on, "the clone" means `$WORK_DIR/grail-hackathon`, and every command runs inside it.

If a `grail-hackathon` folder already exists in `$WORK_DIR`, check that it's a clone of the fork before reusing it:

```bash
git -C "$WORK_DIR/grail-hackathon" remote get-url upstream
```

This should print the GRAIL-innovationai/grail-hackathon URL. If it does, `cd` into the folder and run only the last two commands (`git fetch upstream` and `git checkout -B ...`).

If that command fails but `origin` is the user's fork, the `upstream` remote is just missing: add it, then continue as above.

```bash
git remote add upstream https://github.com/GRAIL-innovationai/grail-hackathon.git
```

If the folder is something else (for example, the team's own project is called `grail-hackathon`), run the fork command from a fresh empty folder instead, such as `"$WORK_DIR/grail-submission"`.

## Step 4: Copy the code

```bash
DEST="submissions/$EVENT/$SLUG"
mkdir -p "$DEST"
```

**If the project folder is a git repo holding just this project** (`git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree` prints `true`), copy only the files git tracks. This respects the team's `.gitignore` and skips `.git`, `node_modules`, `.env` files and build output.

```bash
git -C "$PROJECT_DIR" status --short
git -C "$PROJECT_DIR" ls-files -z | (cd "$PROJECT_DIR" && tar --null -T - -cf -) | tar -xf - -C "$DEST"
```

Lines starting with `??` in the `git status` output are untracked files, which the copy skips. Ask the user whether any of them belong in the submission. If some do, copy them with the command below; don't change the user's repo. If `tar` reports `Cannot stat`, a tracked file was deleted on disk: tell the user, and copy again once they've committed or restored the deletion.

**Otherwise** (not a git repo, or a workspace with other things in it), look at what's there first:

```bash
cd "$PROJECT_DIR" && du -sh -- * .[!.]* 2>/dev/null | sort -h
```

Propose what to include:
- **Include:** source code, dependency files (`requirements.txt`, `package.json`, …), configs, docs, and small result files.
- **Leave out:** datasets, model weights, logs, caches, other projects, and files the team didn't write (such as a downloaded dataset's own README).

Show the user the list and confirm it. Then, from inside the clone, copy only the chosen paths, relative to `PROJECT_DIR`. The paths after `--` below are an example; replace them with the chosen ones:

```bash
(cd "$PROJECT_DIR" && tar -cf - --exclude='.git' --exclude='node_modules' --exclude='.venv' --exclude='venv' \
  --exclude='__pycache__' --exclude='.env' --exclude='*.pem' --exclude='*.key' --exclude='id_rsa*' \
  --exclude='.DS_Store' -- src app.py requirements.txt) | tar -xf - -C "$DEST"
```

Either way, check what landed in `$DEST` (`find "$DEST" -type f | head -100`, `du -sh "$DEST"`). If it holds data files, large outputs, or files the team didn't write, ask the user whether they belong, and delete from `$DEST` the ones that don't.

## Step 5: Write the README

If `$DEST/README.md` came over from the project, keep its content and add whichever of the three required sections it lacks near the top. Otherwise start from the template:

```bash
cp submissions/_template/README.md "$DEST/README.md"
```

The README must contain these three level-2 headings, spelled like this:

```markdown
## Team
## Summary
## How to run
```

Add a `## Demo` section only if the user gave you a demo link. If you started from the template, delete its Demo section otherwise.

Fill them in with the details from Step 1. For the Team section, use the member table format from `submissions/_template/README.md`. Replace every `[placeholder]`. In "How to run", replace paths that only exist on this machine (such as `/workspace/data/...`) with where to get the files, for example the dataset's download page. Show the user the finished README and apply their edits.

## Step 6: Validate

Run the same check CI runs. If `python3` isn't found, use `python` or `py`.

```bash
python3 scripts/validate_submission.py "$DEST"
```

Fix every `ERROR` line and run it again until it prints `OK: submission looks good.` Typical fixes:

- A file over 10 MB, or a folder over 50 MB: delete the file from `$DEST` (never from the user's project), have the user upload it elsewhere (Google Drive, Hugging Face, a GitHub release), and link it in the README.
- `.env` or a private key: delete it from `$DEST`. For `.env`, add a `.env.example` with the same variable names and placeholder values.
- `node_modules/`, `.venv/`, `__pycache__/`: delete it from `$DEST`.

Never edit `scripts/validate_submission.py` to make it pass. CI uses its own copy.

Then look for hard-coded secrets:

```bash
grep -rIinE '(api[_-]?key|secret|token|passw(or)?d)[^=:]*[=:]|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|-----BEGIN [A-Z ]*PRIVATE KEY' "$DEST"
```

Review each match:
- Reading a value from the environment (`os.environ["API_KEY"]`, `process.env.API_KEY`) or an empty placeholder in `.env.example` is fine.
- A real key written into the code is not. Replace it with a read from an environment variable, add the variable to `.env.example`, and tell the user to **rotate the key**, because it is already exposed if the project was ever pushed publicly.

CI also scans for secrets. If `git push` is blocked because it contains a secret, or the pull request's secret scan fails, first revoke or rotate that key — don't use GitHub's link to allow the secret. Then remove the key from the code, commit, and push again. Deleting the key in a new commit isn't enough while the old key still works: the scan checks every commit in the pull request.

## Step 7: Commit, push, and open the pull request

```bash
git add -f "$DEST"
git status --short
```

`-f` is needed because a `.gitignore` copied from the team's project could otherwise make `git add` skip files. This is safe because the validator has already checked the folder for forbidden files.

Every line of `git status --short` must be under `$DEST/`. If anything else shows up, unstage it (`git restore --staged <path>`) and find out why it changed.

Commit with the author from Step 0:

```bash
git -c user.name="$GIT_NAME" -c user.email="$GIT_EMAIL" commit -m "Submit $TEAM_NAME to $EVENT"
```

Before pushing, show the user the staged file list (the `git status --short` output above) and the folder size (`du -sh "$DEST"`), and get their OK. Then:

```bash
git push -u origin "submit/$EVENT/$SLUG"
```

Write the pull request body from `.github/pull_request_template.md`. Fill in the event, team and folder, tick (`[x]`) each checklist item you have verified, and save it to a file outside the repo. Then:

```bash
GH_USER="$(gh api user --jq .login)"
gh pr create --repo GRAIL-innovationai/grail-hackathon --base main \
  --head "$GH_USER:submit/$EVENT/$SLUG" \
  --title "[$EVENT] $TEAM_NAME" --body-file /path/to/pr-body.md
```

## Step 8: Report back

Tell the user:

- The pull request URL.
- A `validate` check now runs on the pull request, and on a first contribution it may wait until an organizer approves it. You can watch it with `gh pr checks <url> --watch` and tell them the result. If it fails, the log shows either validator errors or a secret-scan finding; see Step 6 for how to recover from each, then commit and push to the same branch.
- To change the submission before the deadline, push more commits to the same branch. Don't open a second pull request. Organizers judge lateness by when the last push reached GitHub.

## Updating a submission

If the pull request was already merged or closed, ask the organizers before changing anything. Otherwise, do Step 0, then in the clone:

```bash
git fetch origin
git checkout "submit/$EVENT/$SLUG"
git pull
cp "$DEST/README.md" "$WORK_DIR/grail-readme-backup.md"
git rm -rq "$DEST"
mkdir -p "$DEST"
```

Copy the code again as in Step 4, then restore the README and update it if needed:

```bash
cp "$WORK_DIR/grail-readme-backup.md" "$DEST/README.md"
```

Continue with Steps 6 and 7, but skip `gh pr create`: pushing updates the existing pull request. Before pushing, confirm with the user as in Step 2. Then report back as in Step 8.

## Practice run

Use this when the user wants to try the process without publishing anything. It needs git and Python, but not `gh` or a GitHub login.

1. Do Step 1, and tell the user that nothing will be published.
2. Clone the repo read-only into a working folder chosen as in Step 3:

   ```bash
   cd "$WORK_DIR" && git clone --depth 1 https://github.com/GRAIL-innovationai/grail-hackathon.git grail-hackathon-practice
   ```

3. Do Steps 4, 5 and 6 inside `$WORK_DIR/grail-hackathon-practice`.
4. Show the user the README, the file list (`find "$DEST" -type f`), the folder size (`du -sh "$DEST"`) and the validator output. Stop here. Don't fork, commit, push, or open a pull request.
5. Tell the user they can ask you to submit for real whenever they're ready. That run starts at Step 0 and can reuse the details from this one.

## Without the GitHub CLI

Use this only if Step 0 couldn't install `gh`.

1. Ask the user to open https://github.com/GRAIL-innovationai/grail-hackathon/fork in a browser, create the fork, and tell you their GitHub username (`GH_USER`).
2. Clone the fork and add the upstream remote:
   ```bash
   git clone "https://github.com/$GH_USER/grail-hackathon.git"
   cd grail-hackathon
   git remote add upstream https://github.com/GRAIL-innovationai/grail-hackathon.git
   git fetch upstream
   git checkout -B "submit/$EVENT/$SLUG" upstream/main
   ```
3. Continue with Steps 4 to 7 up to and including `git push`. For the commit author, use the user's name and `<id>+<username>@users.noreply.github.com`; the numeric id is on `https://api.github.com/users/<username>`. `git push` will ask for a GitHub username and a personal access token, because GitHub doesn't accept passwords. Then give the user this link to open the pull request, along with the title and body to paste in:
   `https://github.com/GRAIL-innovationai/grail-hackathon/compare/main...$GH_USER:grail-hackathon:submit/$EVENT/$SLUG?expand=1`
