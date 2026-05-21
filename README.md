# SillyReader
An App for Editing, Reading, and Distributing SillyTavern Chats.

**Editor:**
https://8u6man.github.io/SillyReader/stss-editor

**Reader:**
https://8u6man.github.io/SillyReader/stss-reader

**Editor Manual:**
https://github.com/8u6man/SillyReader/blob/main/EDITOR_GUIDE.md

# This app allows you to:
- Import .jsonl SillyTavern exports
- Assign Global > Character > Message styles (including portraits and backgrounds)
- Create an index of your own story payloads or upload a single story and add them to the masterlist (You'll appear in the author search.)
- Read other people's chats and share your own!

## What is this?

Two complementary tools:

- **The Editor** takes a SillyTavern `.jsonl` chat export and lets you organise it into chapters and scenes, assign styles to characters and individual messages, and export a self-contained "payload" JSON file.
- **The Reader** loads that payload and presents it as a reading experience, with a fullscreen prose mode and a Visual Novel mode with character portraits.

Both run entirely in your browser. No account, no server, no install.

---

## How to read a story

1. Go to the [Reader](https://8u6man.github.io/SillyReader/stss-reader)
2. Either:
   - Click **Search Stories** to browse the community index, or
   - Drop a payload `.json` file onto the page, or
   - Paste a direct URL to a payload file

---

## How to share your own story

### Step 1 — Export a payload from the Editor

1. Open the [Editor](https://8u6man.github.io/SillyReader/stss-editor)
2. Import your SillyTavern `.jsonl` export (or drag and drop onto the Import zone)
3. Organise your messages into chapters/scenes using the Structure panel
4. Optionally add character portraits, backgrounds, fonts, and music (untested) in the Styles panel
5. Click **Export Payload JSON** — this gives you a `.json` file

### Step 2 — Host your payload somewhere

Your payload file needs to be publicly accessible via a direct URL. Two recommended options:

**GitHub (recommended)**  
Create a free GitHub account and a new repository. Upload your payload `.json` file, then get its raw URL:
- Navigate to the file on GitHub
- Click the **Raw** button
- Copy the URL from your browser — it should start with `https://raw.githubusercontent.com/`

> ⚠️ Use the `raw.githubusercontent.com` URL, not the regular `github.com` page URL. The regular URL returns an HTML page, not the raw file, and the Reader won't be able to load it.

**Catbox (quick and easy)**  
Go to [catbox.moe](https://catbox.moe), upload your `.json` file, and copy the link it gives you. No account needed. Note that Catbox links are permanent but not editable — if you update your story you'll get a new URL.

### Step 3 — Add yourself to the community index

Once your story is hosted, you can add it to the Reader's Search Stories index so other people can find it. See [CONTRIBUTING.md](CONTRIBUTING.md) for step-by-step instructions.

---

## Frequently asked questions

**Do I need a SillyTavern account or any AI service to use the Reader?**  
No. The Reader just displays pre-exported story files. You only need SillyTavern if you're creating new chats to export.

**Can I read stories offline?**  
Yes, if you download the payload `.json` and drop it onto the Reader directly. The Reader itself also works offline if you download `stss-reader.html` and `stss-core.js` and open them locally.

**My payload file is huge — is that normal?**  
Payload files embed images (portraits, backgrounds) as base64 data, which can make them large. This is normal. Catbox handles files up to 200MB; GitHub has a 100MB file limit per file (50MB recommended). To reduce filesize, make sure images are compressed before uploading them in the editor. .jpg and .webp are good choices.

**The Reader says "No messages in this story's structure."**  
This means the story was exported before any messages were assigned to the structure tree in the Editor. The author needs to re-export with messages assigned to at least one chapter or scene node.

## Credits

Built by [Wren](https://github.com/8u6man). (and Claude) Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
