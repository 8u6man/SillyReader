# Contributing to SillyReader

Thanks for wanting to share your stories! This guide walks you through adding yourself to the community index so your stories appear in the Reader's Search feature.

If you run into trouble, open an [Issue](../../issues) and we'll help you out.

---

## What is a Pull Request?

A Pull Request (PR) is how you propose a change to someone else's GitHub repository, in this case adding your story or author index to the community list. You make a copy of the repo, make your change, and then send a request for the owner to review and accept it.

---

## Option A — I want to list multiple stories (author index)

This option gives you your own index file that you manage. You can add, remove, or update stories at any time without needing another PR.

### Step 1 — Fork this repository

Click the **Fork** button at the top-right of this page. This creates your own copy of SillyReader under your GitHub account.

### Step 2 — Create your author index file

In your fork, go into the `indices/` folder and create a new file named `YourName.json` (use whatever name you want to appear in the search).

The file should look like this:

```json
{
  "author": "YourName",
  "stories": [
    {
      "title": "My Story Title",
      "url": "https://raw.githubusercontent.com/YOURUSERNAME/YOURREPO/main/stories/my_story.json",
      "description": "A short description of your story. Optional but recommended."
    },
    {
      "title": "Another Story",
      "url": "https://catbox.moe/yourfile.json",
      "description": "Descriptions show up in search results."
    }
  ]
}
```

> ⚠️ If hosting on GitHub, make sure your story URLs use `raw.githubusercontent.com`, not `github.com/blob/`. See the [hosting guide in the README](README.md#step-2--host-your-payload-somewhere) for details.

### Step 3 — Add yourself to the masterlist

In your fork, open `masterlist.json` and add one entry to the `indices` array pointing to your new index file:

```json
{
  "name": "YourName",
  "url": "https://raw.githubusercontent.com/YOURUSERNAME/SillyReader/main/indices/YourName.json"
}
```

> Note: this URL points to your **fork**, not the main SillyReader repo. That's intentional — you control your own index file.

### Step 4 — Submit a Pull Request

1. Go to your fork on GitHub
2. Click **Contribute** → **Open Pull Request**
3. Make sure the base repository is `8u6man/SillyReader` and the base branch is **`staging`** (not `main`)
4. Give your PR a title like "Add [YourName] to masterlist"
5. Click **Create Pull Request**

That's it! Once reviewed and merged to `staging` and then `main`, your name will appear in the Search Stories index.

---

## Option B — I just want to share one story

If you only have one story and don't want to maintain a separate index file, you can point directly to your payload file in the masterlist. The Reader will detect it automatically.

Follow the same steps as Option A, but skip creating an index file. In Step 3, add your entry like this instead:

```json
{
  "name": "YourName",
  "url": "https://raw.githubusercontent.com/YOURUSERNAME/YOURREPO/main/stories/my_story.json"
}
```

Or with Catbox:

```json
{
  "name": "YourName",
  "url": "https://files.catbox.moe/yourfile.json"
}
```

The URL can point to a GitHub raw file or a Catbox link — either works.

> Note: if you go with Option B and later want to add more stories, you'd need another PR to switch your entry to an author index. Starting with Option A is worth it if you think you'll share more than one story.

---

## Updating your stories

**If you used Option A (author index):** Just edit your index file in your fork — add, remove, or change story entries and update the URLs. No PR needed; the masterlist already points to your file and the Reader fetches it fresh each time.

**If you used Option B (direct payload):** Update the file at your hosting location. If you're on GitHub, commit the new version; if you're on Catbox, you'll need to re-upload and submit a new PR with the updated URL since Catbox links don't update in place.

---

## Checklist before submitting your PR

- [ ] My story payload is hosted at a publicly accessible URL
- [ ] I'm using `raw.githubusercontent.com` URLs (not `github.com/blob/`) for any GitHub-hosted files
- [ ] My `masterlist.json` entry is valid JSON (no trailing commas, quotes around all keys and values)
- [ ] My PR targets the `staging` branch, not `main`
- [ ] I've tested the URL by pasting it into the Reader's URL field and confirming it loads