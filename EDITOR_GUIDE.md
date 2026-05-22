# SillyReader Editor — User Guide

The Editor is where you turn a raw SillyTavern chat export into a styled, readable story. This guide walks through everything you need to know to get from a `.jsonl` file to a finished payload.

---
**Important:** If you read nothing else: Images are encoded as Base64 and embedded in the project payload. Please be considerate of others and compress your images before uploading them in the editor. JPG or WEBP are good choices.
---

## The basics:

SillyTavern exports your chats as `.jsonl` files — one message per line, no formatting, no structure. The Editor lets you:

- Organise those messages into chapters and scenes
- Style characters with portraits, colours, and backgrounds
- Fine-tune individual messages with their own overrides
- Export a self-contained payload `.json` that the Reader can load

The Reader only displays what the Editor tells it to. If a message isn't assigned to the structure, it won't appear. If it's marked hidden, it's skipped entirely. For messages to be visible in the reader they must be both assigned in the structure panel and not marked as hidden (the eye symbol.)

---

## Importing your chat

Drag your `.jsonl` file onto the **Import .jsonl** zone in the left sidebar, or click it to browse. The Editor will load all your messages into the message list on the right.

**You can re-import the same chat later.** If you've continued a roleplay after your first import, just drag the updated `.jsonl` in again. The Editor checks each message by its timestamp and only adds new ones — nothing gets duplicated, and your existing structure and style work is preserved.

---

## The Structure panel

The structure is the skeleton of your story. Before anything will appear in the Reader, you need to build a structure and assign messages to it.

### Creating nodes

Click **+** in the Structure header to add a root node (a top-level chapter). With a node selected, click **↳** to add a child node underneath it. Nodes can be nested as deep as you like — Arcs containing Chapters containing Scenes, for example.

Double-click any node title to rename it. The **type** label (Chapter, Scene, etc.) is just a display label — call them whatever makes sense for your story.

### Leaf nodes and branch nodes

This is the key rule: **only leaf nodes can hold messages.** A leaf node is one with no children. A branch node is one that has children — it acts as a container and can't hold messages directly.

If you add a child to a node that already has messages assigned, the Editor will warn you — those messages will need to be reassigned to the new child nodes.

### Assigning messages

1. Click a leaf node in the structure to select it — the breadcrumb at the top of the message panel will confirm which node you're assigning to
2. Select messages in the list (see selection tips below)
3. Click **Assign to node**

Assigned messages appear dimmed in the list and show a badge with their node name. You can reassign them later by selecting them and assigning to a different node, or click **Unassign** to remove the assignment entirely.

> ⚠️ **Assign at least one message before exporting.** A payload with an empty structure will load in the Reader but show nothing. The Reader only renders messages that are in the structure.

### Reading order

Messages are rendered in the order they appear within each leaf node, and nodes are read depth-first from top to bottom. The order you assign messages is the order they appear — so if your chat has a natural chronological order, assign them that way.

---

## Selecting messages

The message list supports flexible selection:

- **Click** — select just that message
- **Ctrl/Cmd + Click** — add or remove a single message from the selection
- **Shift + Click** — select a range from the last clicked message to this one
- **Select all visible** — the button in the filter bar selects everything currently shown, respecting any active filters

Use the **Unassigned only** filter to quickly find messages you haven't placed yet.

Selected messages can have presets or message authors applied in bulk.

---

## Hiding messages

Every message has a small eye icon on its row. Click it to toggle the message hidden. Hidden messages:

- Stay in your project and keep their index numbers
- Are **completely skipped** by the Reader — they don't appear at all, not even as a gap
- Are useful for cutting narrator setup text, OOC notes, or anything else you don't want readers to see

Hidden messages appear faded in the Editor with their name struck through so you can still see them while working.

---

## Editing message text

Each message row has a small **✎** edit zone on its right edge — it blends in a little, but hover over any message and you'll see it. Click it to open the preview panel, where you can read the full message text and edit it directly.

Edits are saved back to the project (the **Save Edit** button activates when you've made changes) and marked with an "edited" badge on the message row. The original `.jsonl` file is never touched.

Additionally there is a Find & Replace function that affects all messages simulataneosly.

---

## The Styles panel

Switch to the **Styles** tab in the left sidebar to access all visual styling. The right panel switches to a live preview so you can see your changes in real time. Use the **◀ ▶** arrows to step through messages in the preview.

### How style inheritance works

Styles cascade from global down to the individual message:

```
Global → Character → Message
```

- **Global** styles are the defaults for the whole story — background, font, text colour, bubble appearance
- **Character** styles override globals for every message that character sends
- **Message** styles override everything for just that one message

You only need to set something at a lower level when you want it to differ from what's above it. Leave a field blank and it inherits from the level above.

### Global styles

Set your story's overall look here — background image or colour, font family and size, text colour, and bubble background colour and opacity. These apply to every message unless overridden.

### Character styles

Each character who appears in your chat gets their own card in the Characters section. Expand a card to set that character's portrait, text colour, text shadow, font, and bubble appearance. These apply to every message from that character.

A character with no overrides set simply inherits from globals — you don't have to configure every character if the global defaults work for them.

### Message styles

With a message selected in the preview (use ◀ ▶ to navigate), the Messages section shows override fields for just that message. Anything you set here applies only to that one message and overrides both global and character styles.

This is how you do things like:
- A specific message with a different background image (a scene change)
- A one-off portrait swap
- A message with a music track that starts playing when the reader reaches it
- A sting sound effect that fires once as the reader hits that line

Fields with an active override are highlighted in amber so you can see at a glance what's been customised.

### Message style presets

If you find yourself applying the same combination of overrides to multiple messages — a particular glow effect, a specific bubble style — you can save it as a preset.

1. Set up the overrides on a message
2. Click **+** next to the preset dropdown to save it with a name
3. Navigate to another message and select your preset from the dropdown
4. Click **↓** to apply it

Presets apply only the fields they contain — they won't clear overrides you've set separately on the target message.

---

## Portraits and backgrounds

Both portraits and backgrounds are stored as part of the payload — you upload them once in the Editor and they're embedded in the export. No external hosting needed for images.

- **Character portraits** set in the Character panel appear for every message from that character
- **Message-level portraits** override the character portrait for just that message
- **Backgrounds** work the same way — a global background applies everywhere, a message-level background kicks in when the reader reaches that message and persists until another message sets a new one

In the Reader's Visual Novel mode, the portrait updates with a crossfade each time the speaker changes.

---

## Exporting

When you're ready, click **Export Payload JSON** at the bottom of the sidebar. This downloads a single `.json` file containing everything — messages, structure, styles, and all embedded images. (Alternatively saving a project file works as well.)

This file is what you host and share. See the [README](README.md) for hosting options and how to add your story to the community index.

### Autosave

The Editor autosaves your project to your browser's local storage as you work*, so you won't lose progress if you close the tab. Use **Load Project** in the top bar to load a previously exported payload back into the Editor if you want to continue working on it in a new session.

*Browser storage is limited and long stories can immediately cross that limit. Saving manually via the save button in the top right, or exporting the project are the only recourse for long chats.

---

## Quick reference

| Action | How |
|--------|-----|
| Import chat | Drag `.jsonl` onto the Import zone |
| Add root node | **+** in Structure header |
| Add child node | Select a node, then **↳** |
| Rename node | Double-click the node title |
| Select message range | Shift+click |
| Select individual messages | Ctrl/Cmd+click |
| Hide a message | Click the eye icon on the message row |
| Edit message text | Click the **✎** zone on the right of any message row |
| Save a style preset | Set overrides on a message, click **+** by the preset dropdown |
| Apply a style preset | Select preset from dropdown, click **↓** |
| Export | **Export Payload JSON** button, bottom of sidebar |
