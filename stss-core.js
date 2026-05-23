/**
 * stss-core.js
 * SillyTavern Story System — Core Data Library
 *
 * Shared by both the Editor and the Reader.
 * Handles:
 *   - Parsing .jsonl chat exports into a raw message list
 *   - Building and managing the Master Project Object (payload schema)
 *   - Image registry for deduplication of base64 assets
 *   - Diff-checking imports so manual edits are never overwritten
 *   - Resolving inherited styles (Global > Character > Message)
 *   - Style presets (named snapshots of message-level overrides)
 *
 * No dependencies. Works in any modern browser or Node.js environment.
 */

"use strict";

// ---------------------------------------------------------------------------
// SECTION 1: SCHEMA FACTORIES
// ---------------------------------------------------------------------------

/**
 * Creates a blank Master Project Object.
 *
 * @param {string} title
 * @returns {object}
 */
function createProject(title = "Untitled Story") {
  return {
    schema_version: 1,

    meta: {
      title:       title,
      author:      "",
      description: "",
      created:     new Date().toISOString(),
      modified:    new Date().toISOString(),
    },

    // Global defaults — every message inherits these unless overridden
    globals: {
      background:        null,   // image registry hash key, or null
      background_css:    "background-color: #1a1a2e",
      font_family:       "Georgia, serif",
      font_size:         "1rem",
      text_color:        "#e0e0e0",
      text_shadow:       null,
      bubble_bg_color:   "#000000",
      bubble_bg_opacity: "0.45",
      bubble_css:        null,
      music_url:         null,
      quote_color:       null,
      sq_color:          null,
      action_color:      null,
    },

    // Per-character style overrides. Key = character name string.
    characters: {},

    // Story structure — recursive tree of nodes.
    structure: [],

    // Message dictionary. Key = send_date ISO string.
    messages: {},

    // Image registry — deduplicates base64 assets across the whole project.
    // Key = djb2 hash of the base64 string. Value = the base64 data URL.
    // All image fields (portrait, background) store a hash key, not raw base64.
    image_registry: {},

    // Named style presets — snapshots of message-level override fields.
    // null fields in a preset are skipped when applying (partial presets allowed).
    style_presets: [],
  };
}

/**
 * Creates a blank structure node.
 *
 * @param {string} type  - User-defined label, e.g. "Chapter", "Scene"
 * @param {string} title - Display name
 * @returns {object}
 */
function createNode(type = "Chapter", title = "Untitled") {
  return {
    id:       generateId(),
    type:     type,
    title:    title,
    children: [],
    messages: [],
  };
}

/**
 * Creates a blank message entry for the messages dictionary.
 * Source fields come from the JSONL; override fields default to null (inherit).
 *
 * @param {object} raw   - A single parsed JSONL line
 * @param {number} index - Sequential index assigned at import time
 * @returns {object}
 */
function createMessage(raw, index) {
  return {
    // --- Source data (from JSONL, read-only after import) ---
    msg_index:     index,
    name:          raw.name      || "Unknown",
    is_user:       raw.is_user   || false,
    is_system:     raw.is_system || false,
    mes:           raw.mes       || "",
    model:         (raw.extra && raw.extra.model) ? raw.extra.model : null,
    source_avatar: raw.force_avatar || null,
    source_name:   raw.name      || "Unknown",

    // --- Edit / visibility tracking ---
    edited: false,
    hidden: false,

    // --- Override fields (null = inherit from character or globals) ---
    // Image fields store a hash key into project.image_registry, not raw base64.
    portrait:          null,
    background:        null,
    background_css:    null,
    font_family:       null,
    font_size:         null,
    text_color:        null,
    text_shadow:       null,
    bubble_bg_color:   null,
    bubble_bg_opacity: null,
    bubble_css:        null,
    music_url:         null,
    sting_url:         null,
    quote_color:       null,
    sq_color:          null,
    action_color:      null,
  };
}

/**
 * Creates a blank character style entry.
 * Used by the Editor when a new character name is encountered.
 *
 * @returns {object}
 */
function createCharacter() {
  return {
    portrait:          null,  // image registry hash key
    text_color:        null,
    text_shadow:       null,
    font_family:       null,
    bubble_bg_color:   null,
    bubble_bg_opacity: null,
    bubble_css:        null,
    theme_url:         null,
    quote_color:       null,
    sq_color:          null,
    action_color:      null,
  };
}

// ---------------------------------------------------------------------------
// SECTION 2: IMAGE REGISTRY
// Deduplicates base64 image assets across the project.
// All image-bearing fields store a short hash key; raw data lives here.
// ---------------------------------------------------------------------------

/**
 * Fast djb2 hash of a string.
 * Returns a hex string, typically 8 characters.
 * Not cryptographic — just needs to be consistent and collision-resistant
 * for the small number of images in a typical project.
 *
 * @param {string} str
 * @returns {string} hex hash
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // djb2: hash = hash * 33 ^ char
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    // Keep it 32-bit signed
    hash = hash | 0;
  }
  // Convert to unsigned hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Registers a base64 data URL in the project's image registry.
 * If the same image was already registered, returns the existing hash key
 * instead of creating a duplicate entry.
 *
 * @param {object} project   - The project object (mutated)
 * @param {string} base64    - A data URL string, e.g. "data:image/png;base64,..."
 * @returns {string}         - The hash key to store in image fields
 */
function registerImage(project, base64) {
  if (!base64) return null;

  // Ensure the registry exists (forward-compatibility with older projects)
  if (!project.image_registry) project.image_registry = {};

  const hash = djb2Hash(base64);

  if (!project.image_registry[hash]) {
    project.image_registry[hash] = base64;
  }

  return hash;
}

/**
 * Resolves an image field value to its actual base64 data URL.
 * Handles both hash keys (new format) and raw base64 strings (legacy format).
 *
 * @param {object}      project  - The project object
 * @param {string|null} hashOrB64 - Hash key or raw base64 string
 * @returns {string|null} The base64 data URL, or null if not found
 */
function resolveImage(project, hashOrB64) {
  if (!hashOrB64) return null;

  // Legacy format: raw base64 data URL stored directly in the field
  if (hashOrB64.startsWith("data:")) return hashOrB64;

  // New format: look up the hash in the registry
  const registry = project.image_registry || {};
  return registry[hashOrB64] || null;
}

/**
 * Migrates a loaded project from legacy format (raw base64 in image fields)
 * to the registry format (hash keys in image fields, data in image_registry).
 *
 * Called automatically by importProject(). Safe to call multiple times.
 *
 * @param {object} project - Mutated in place
 */
function migrateImageFields(project) {
  if (!project.image_registry) project.image_registry = {};

  // Fields that may contain images at each level
  const IMAGE_FIELDS = ["portrait", "background"];

  // Globals
  for (const field of IMAGE_FIELDS) {
    const val = project.globals[field];
    if (val && val.startsWith("data:")) {
      project.globals[field] = registerImage(project, val);
    }
  }

  // Characters
  for (const name of Object.keys(project.characters)) {
    for (const field of IMAGE_FIELDS) {
      const val = project.characters[name][field];
      if (val && val.startsWith("data:")) {
        project.characters[name][field] = registerImage(project, val);
      }
    }
  }

  // Messages
  for (const key of Object.keys(project.messages)) {
    for (const field of IMAGE_FIELDS) {
      const val = project.messages[key][field];
      if (val && val.startsWith("data:")) {
        project.messages[key][field] = registerImage(project, val);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SECTION 3: JSONL PARSER
// ---------------------------------------------------------------------------

/**
 * Parses the raw text of a .jsonl file.
 * Returns the metadata header separately from the message array.
 * Also detects whether this is a Chub Venus export (identified by a header
 * line containing user_name + character_name but no chat_metadata).
 *
 * @param {string} text
 * @returns {{ chatMeta: object|null, messages: object[], isChub: boolean }}
 */
function parseJsonl(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let chatMeta = null;
  let isChub   = false;
  const messages = [];

  for (let i = 0; i < lines.length; i++) {
    let parsed;
    try {
      parsed = JSON.parse(lines[i]);
    } catch (e) {
      console.warn(`stss-core: Skipping malformed line ${i + 1}:`, e.message);
      continue;
    }

    if (parsed.chat_metadata !== undefined) {
      chatMeta = parsed;
      continue;
    }

    // Chub Venus header: first line has user_name + character_name, no send_date
    if (i === 0 && parsed.user_name !== undefined && parsed.character_name !== undefined
        && parsed.send_date === undefined) {
      isChub   = true;
      chatMeta = parsed;
      continue;
    }

    messages.push(parsed);
  }

  return { chatMeta, messages, isChub };
}

/**
 * Imports parsed JSONL messages into an existing project.
 * Applies diff-check: existing send_date keys are skipped to preserve edits.
 *
 * When a timestamp collision occurs, the incoming message's name is checked
 * against the existing entry — if the names differ it's a genuinely different
 * message and is admitted with a composite key; if they match it's a true
 * duplicate and is skipped. This handles Chub Venus exports (which reuse
 * timestamps across characters) as well as ST setups that truncate timestamps
 * to minute precision.
 *
 * @param {object}   project     - Mutated in place
 * @param {object[]} rawMessages - From parseJsonl()
 * @returns {{ added: number, skipped: number }}
 */
function importMessages(project, rawMessages) {
  let added   = 0;
  let skipped = 0;

  // Find the highest existing index so re-imports continue numbering correctly
  let nextIndex = -1;
  for (const m of Object.values(project.messages)) {
    if (m.msg_index !== undefined && m.msg_index > nextIndex) {
      nextIndex = m.msg_index;
    }
  }
  nextIndex += 1;

  for (const raw of rawMessages) {
    if (!raw.send_date) {
      console.warn("stss-core: Message has no send_date, skipping:", raw);
      skipped++;
      continue;
    }

    const key      = String(raw.send_date);
    const existing = project.messages[key];

    if (existing !== undefined) {
      // Collision: check if it's a different speaker — if so, admit it
      if ((existing.source_name || existing.name) !== (raw.name || "Unknown")) {
        const altKey = key + "_" + (raw.name || "Unknown");
        if (project.messages[altKey] === undefined) {
          project.messages[altKey] = createMessage(raw, nextIndex);
          nextIndex++;
          added++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
      continue;
    }

    project.messages[key] = createMessage(raw, nextIndex);
    nextIndex++;
    added++;
  }

  project.meta.modified = new Date().toISOString();
  return { added, skipped };
}

/**
 * Convenience: parse + import in one call.
 *
 * @param {string} jsonlText
 * @param {object} project
 * @returns {{ chatMeta: object, added: number, skipped: number, isChub: boolean }}
 */
function ingestJsonl(jsonlText, project) {
  const { chatMeta, messages, isChub } = parseJsonl(jsonlText);
  const { added, skipped }             = importMessages(project, messages);
  return { chatMeta, added, skipped, isChub };
}

// ---------------------------------------------------------------------------
// SECTION 3B: AI-CHARACTER-CHAT (AICC) PARSER
// Handles the Dexie JSON export format from ai-character-chat.com.
// A single export may contain multiple tables; we only care about
// "characters" (for name lookup) and "messages" (the actual chat).
// The caller is expected to pass a single-thread export; if multiple
// threads are present all their messages will be imported together,
// ordered by creationTime (which doubles as the unique key).
// ---------------------------------------------------------------------------

/**
 * Finds a table by name in the AICC export's data.data array.
 * Returns its rows array, or [] if not found.
 *
 * @param {object} root  - Parsed AICC JSON root object
 * @param {string} name  - Table name, e.g. "characters" or "messages"
 * @returns {object[]}
 */
function _aiccTable(root, name) {
  const tables = root && root.data && Array.isArray(root.data.data)
    ? root.data.data : [];
  const table = tables.find(t => t.tableName === name);
  return (table && Array.isArray(table.rows)) ? table.rows : [];
}

/**
 * Parses an AICC Dexie JSON export object into a normalised message list
 * compatible with importMessages().
 *
 * Name resolution priority per message:
 *   1. message.name (non-null inline name, e.g. "Narrator")
 *   2. characterId lookup → character.name  (AI characters)
 *   3. characterId === -1  → userCharacter name from the character row
 *                            (falls back to "User" if not set)
 *   4. characterId === -2  → "Narrator" (system/narrator slot)
 *   5. anything else unresolved → "Unknown"
 *
 * The returned objects are shaped so createMessage() / importMessages()
 * can consume them directly — they carry a synthetic `send_date` field
 * (the string form of creationTime) used as the unique dict key.
 *
 * @param {object} root - Parsed AICC JSON root object
 * @returns {{
 *   chatMeta: object,
 *   messages: object[]
 * }}
 */
function parseAicc(root) {
  // ---- Build character id → name map ----
  const charRows = _aiccTable(root, "characters");
  const idToName = {};   // numeric id  → character name string
  let   userName = "User"; // fallback user name

  for (const char of charRows) {
    if (char.id !== undefined && char.name) {
      idToName[char.id] = char.name;
    }
    // Prefer the most specific user name we can find.
    // The character row may have userCharacter.name set.
    if (char.userCharacter && char.userCharacter.name) {
      userName = char.userCharacter.name;
    }
  }

  // ---- Parse messages ----
  const msgRows = _aiccTable(root, "messages");

  // Sort by creationTime ascending so order is deterministic on import
  const sorted = msgRows.slice().sort((a, b) => a.creationTime - b.creationTime);

  const messages = [];

  for (const row of sorted) {
    if (!row.creationTime) {
      console.warn("stss-core (AICC): message missing creationTime, skipping:", row);
      continue;
    }

    // Resolve speaker name
    let name;
    if (row.name != null && row.name !== "") {
      // Inline name wins (Narrator, custom personas, etc.)
      name = row.name;
    } else if (row.characterId === -1) {
      name = userName;
    } else if (row.characterId === -2) {
      name = "Narrator";
    } else if (idToName[row.characterId]) {
      name = idToName[row.characterId];
    } else {
      name = "Unknown";
    }

    const isUser   = row.characterId === -1;
    const isSystem = row.characterId === -2;

    // Normalise into the shape importMessages() / createMessage() expects.
    // send_date is the unique key — we use the string form of creationTime.
    messages.push({
      send_date:    String(row.creationTime),
      name,
      is_user:      isUser,
      is_system:    isSystem,
      mes:          row.message || "",
      extra:        {},
      force_avatar: null,
    });
  }

  // Build a lightweight chatMeta equivalent so the caller gets
  // the same return shape as ingestJsonl()
  const threadRows = _aiccTable(root, "threads");
  const chatMeta = {
    source:     "aicc",
    threadName: threadRows.length > 0 ? (threadRows[0].name || "Imported Thread") : "Imported Thread",
    threadCount: threadRows.length,
  };

  return { chatMeta, messages };
}

/**
 * Detects whether a parsed JSON object looks like an AICC Dexie export.
 * Used by the editor to route the file to the right parser.
 *
 * @param {object} root
 * @returns {boolean}
 */
function isAiccExport(root) {
  return (
    root &&
    root.formatName === "dexie" &&
    root.data &&
    Array.isArray(root.data.data)
  );
}

/**
 * Convenience: parse + import an AICC export in one call.
 * Mirrors the signature of ingestJsonl() for drop-in use in the editor.
 *
 * @param {string} jsonText  - Raw file text
 * @param {object} project   - Mutated in place
 * @returns {{ chatMeta: object, added: number, skipped: number }}
 */
function ingestAicc(jsonText, project) {
  let root;
  try {
    root = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("AICC import: invalid JSON — " + e.message);
  }

  if (!isAiccExport(root)) {
    throw new Error("AICC import: file does not look like an AI-Character-Chat export.");
  }

  const { chatMeta, messages } = parseAicc(root);
  const { added, skipped }     = importMessages(project, messages);
  return { chatMeta, added, skipped };
}

// ---------------------------------------------------------------------------
// SECTION 4: STYLE RESOLVER
// Global > Character > Message inheritance chain.
// ---------------------------------------------------------------------------

/**
 * All fields that participate in style inheritance.
 * Image fields resolve through resolveImage() after this lookup.
 */
const INHERITABLE_FIELDS = [
  "portrait",
  "background",
  "background_css",
  "font_family",
  "font_size",
  "text_color",
  "text_shadow",
  "bubble_bg_color",
  "bubble_bg_opacity",
  "bubble_css",
  "music_url",
  "sting_url",
  "quote_color",
  "sq_color",
  "action_color",
];

/**
 * Resolves the final computed style for a single message.
 * Applies Global > Character > Message priority.
 * Image fields contain hash keys — call resolveImage() to get actual data URLs.
 *
 * @param {object} project
 * @param {string} sendDate
 * @returns {object} Resolved style values for every INHERITABLE_FIELD
 */
function resolveStyle(project, sendDate) {
  const message   = project.messages[sendDate];
  const charName  = message ? message.name : null;
  const charStyle = (charName && project.characters[charName])
    ? project.characters[charName] : {};
  const globals   = project.globals;

  const resolved = {};

  // isSet: a field is "set" only if it's neither null nor undefined.
  // This is necessary because undefined !== null (true), which would cause
  // an undefined character field to incorrectly block fallthrough to globals.
  function isSet(v) { return v !== null && v !== undefined; }

  for (const field of INHERITABLE_FIELDS) {
    if (message && isSet(message[field])) {
      resolved[field] = message[field];
    } else if (isSet(charStyle[field])) {
      resolved[field] = charStyle[field];
    } else if (isSet(globals[field])) {
      resolved[field] = globals[field];
    } else {
      resolved[field] = null;
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// SECTION 5: STYLE PRESETS
// ---------------------------------------------------------------------------

/**
 * The list of fields captured and applied by a style preset.
 * Matches message-level override fields exactly.
 */
const PRESET_FIELDS = [
  "portrait", "background", "background_css",
  "font_family", "font_size",
  "text_color", "text_shadow",
  "bubble_bg_color", "bubble_bg_opacity", "bubble_css",
  "music_url", "sting_url",
  "quote_color", "sq_color", "action_color",
];

/**
 * Creates a new style preset from the current state of a message.
 * Only captures non-null fields — null fields are omitted so the preset
 * can be partial (applied without clobbering unrelated overrides).
 *
 * @param {object} project
 * @param {string} sendDate  - The message to snapshot
 * @param {string} name      - Human-readable preset name
 * @returns {object} The preset object (also added to project.style_presets)
 */
function createPreset(project, sendDate, name) {
  if (!project.style_presets) project.style_presets = [];

  const msg    = project.messages[sendDate];
  const preset = { id: generateId(), name: name };

  for (const field of PRESET_FIELDS) {
    // Only include fields that are actually set on this message
    if (msg[field] !== null && msg[field] !== undefined) {
      preset[field] = msg[field];
    }
  }

  project.style_presets.push(preset);
  return preset;
}

/**
 * Applies a preset to a message.
 * Only sets fields that are present and non-null in the preset —
 * null fields on the message are left untouched.
 *
 * @param {object} project
 * @param {string} sendDate  - Target message
 * @param {string} presetId  - ID of the preset to apply
 */
function applyPreset(project, sendDate, presetId) {
  if (!project.style_presets) return;

  const preset = project.style_presets.find(p => p.id === presetId);
  if (!preset) return;

  const msg = project.messages[sendDate];
  if (!msg) return;

  for (const field of PRESET_FIELDS) {
    if (preset[field] !== null && preset[field] !== undefined) {
      msg[field] = preset[field];
    }
  }
}

/**
 * Deletes a preset by id.
 *
 * @param {object} project
 * @param {string} presetId
 */
function deletePreset(project, presetId) {
  if (!project.style_presets) return;
  project.style_presets = project.style_presets.filter(p => p.id !== presetId);
}

// ---------------------------------------------------------------------------
// SECTION 6: STRUCTURE TREE UTILITIES
// ---------------------------------------------------------------------------

/**
 * Finds a node anywhere in the tree by id. Returns null if not found.
 *
 * @param {object[]} tree
 * @param {string}   id
 * @returns {object|null}
 */
function findNodeById(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * Returns an ordered flat list of all send_date keys via depth-first walk.
 * Defines the reading order. Only leaf nodes contribute messages.
 *
 * @param {object[]} tree
 * @returns {string[]}
 */
function getFlatMessageOrder(tree) {
  const order = [];
  function walk(nodes) {
    for (const node of nodes) {
      if (node.children.length > 0) {
        walk(node.children);
      } else {
        order.push(...node.messages);
      }
    }
  }
  walk(tree);
  return order;
}

/**
 * Returns true if a node is a leaf (no children).
 *
 * @param {object} node
 * @returns {boolean}
 */
function isLeafNode(node) {
  return node.children.length === 0;
}

// ---------------------------------------------------------------------------
// SECTION 7: PROJECT SERIALIZATION
// ---------------------------------------------------------------------------

/**
 * Serializes a project to pretty-printed JSON (the payload).
 *
 * @param {object} project
 * @returns {string}
 */
function exportProject(project) {
  project.meta.modified = new Date().toISOString();
  return JSON.stringify(project, null, 2);
}

/**
 * Deserializes a JSON string back into a project object.
 * Validates required top-level keys and runs legacy migration automatically.
 *
 * @param {string} jsonText
 * @returns {object}
 * @throws {Error} if JSON is invalid or required fields are missing
 */
function importProject(jsonText) {
  let project;
  try {
    project = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("Invalid JSON: " + e.message);
  }

  const required = ["schema_version", "meta", "globals", "characters", "structure", "messages"];
  for (const key of required) {
    if (project[key] === undefined) {
      throw new Error(`Project is missing required field: "${key}"`);
    }
  }

  // Ensure new fields exist on older projects
  if (!project.image_registry) project.image_registry = {};
  if (!project.style_presets)  project.style_presets  = [];

  // Migrate any raw base64 image data to the registry format
  migrateImageFields(project);

  return project;
}

// ---------------------------------------------------------------------------
// SECTION 8: UTILITIES
// ---------------------------------------------------------------------------

/**
 * Generates a short random alphanumeric ID (6 chars).
 * Not cryptographically secure — just needs to be unique within a project.
 *
 * @returns {string} e.g. "k7x2m9"
 */
function generateId() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Returns a sorted array of all unique speaker names in the message dict.
 * Includes users, system/narrator, and AI characters — everyone with a name.
 *
 * @param {object} messages - project.messages
 * @returns {string[]}
 */
function getCharacterNames(messages) {
  const names = new Set();
  for (const key of Object.keys(messages)) {
    const name = messages[key].name;
    if (name && name.trim() !== "") {
      names.add(name.trim());
    }
  }
  return Array.from(names).sort();
}

// ---------------------------------------------------------------------------
// SECTION 9: EXPORTS
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.STSS = {
    // Schema factories
    createProject,
    createNode,
    createMessage,
    createCharacter,
    // Image registry
    djb2Hash,
    registerImage,
    resolveImage,
    migrateImageFields,
    // Parser & ingest
    parseJsonl,
    importMessages,
    ingestJsonl,
    parseAicc,
    isAiccExport,
    ingestAicc,
    // Style resolution
    resolveStyle,
    INHERITABLE_FIELDS,
    // Style presets
    createPreset,
    applyPreset,
    deletePreset,
    PRESET_FIELDS,
    // Tree utilities
    findNodeById,
    getFlatMessageOrder,
    isLeafNode,
    // Serialization
    exportProject,
    importProject,
    // Utilities
    generateId,
    getCharacterNames,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createProject, createNode, createMessage, createCharacter,
    djb2Hash, registerImage, resolveImage, migrateImageFields,
    parseJsonl, importMessages, ingestJsonl,
    parseAicc, isAiccExport, ingestAicc,
    resolveStyle, INHERITABLE_FIELDS,
    createPreset, applyPreset, deletePreset, PRESET_FIELDS,
    findNodeById, getFlatMessageOrder, isLeafNode,
    exportProject, importProject,
    generateId, getCharacterNames,
  };
}
