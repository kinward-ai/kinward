/**
 * KINWARD CHAT MODES
 *
 * Conversation modes as data, not code. Each row in the `chat_modes` table
 * defines a mode: display info for the picker, the system-prompt extension
 * appended to the AI's core identity, sampling settings, which model-catalog
 * category the mode prefers, and which profile roles can see it.
 *
 * The `source` column tags ownership:
 *   built-in — defined in BUILT_IN_MODES below; app-owned. Re-synced on every
 *              boot so prompt improvements reach existing installs on update.
 *              Never edit these rows in the DB — changes will be overwritten.
 *   family   — created by the family (future: mode editor). Never touched by sync.
 *   bundle   — delivered via signed context bundles (future). Never touched by sync.
 *
 * To add a new built-in mode: add an entry to BUILT_IN_MODES and it ships
 * with the next app update. No schema change, no route change.
 */

const { getDb } = require("./db");

// Roles: admin, co-admin, teen, child, guest.
// Mirrors the original CategoryPicker rules: children see only kid-appropriate
// modes, teens see everything except Kids mode, adults and guests see all.
const ADULT_AND_TEEN = ["admin", "co-admin", "teen", "guest"];
const KID_APPROPRIATE = ["admin", "co-admin", "child", "guest"];

const BUILT_IN_MODES = [
  {
    id: "general",
    name: "General Assistant",
    description: "Everyday questions and conversation",
    icon: "💬",
    color: "#5A8BAD",
    system_prompt: `You are in General Assistant mode. You help with everyday questions, planning, writing, brainstorming, and anything else the family needs. Keep responses clear and well-organized. Match the depth of your answer to the complexity of the question — a simple question gets a simple answer.`,
    temperature: 0.7,
    max_tokens: 2048,
    model_category: "general",
    visible_roles: ADULT_AND_TEEN,
    sort_order: 10,
  },
  {
    id: "kids",
    name: "Kids Assistant",
    description: "Age-appropriate help for younger minds",
    icon: "🌟",
    color: "#6BAF7D",
    system_prompt: `You are in Kids Mode. The family member you're talking to is a child. Adjust accordingly:
- Use simple, age-appropriate language. Short sentences. No jargon.
- Be encouraging and patient. Celebrate curiosity.
- For homework help: guide them to the answer, don't just give it. Ask leading questions. "What do you think happens when..." is better than stating the fact.
- If they ask about something inappropriate or concerning, gently redirect and suggest they talk to a parent. Don't lecture — just guide.
- Keep responses shorter than other modes. Kids lose interest in walls of text.
- Make learning fun. Use analogies they'd understand — games, animals, stories.
- STRICT: No violent content, no scary content, no mature themes. If a topic edges into mature territory, keep it age-appropriate and suggest asking a parent for more detail.
- If you're not sure if something is appropriate, err on the side of caution.`,
    temperature: 0.5,
    max_tokens: 2048,
    model_category: "kids",
    visible_roles: KID_APPROPRIATE,
    sort_order: 20,
  },
  {
    id: "research",
    name: "Research",
    description: "Deep dives, analysis, and learning",
    icon: "🔍",
    color: "#C75B2A",
    system_prompt: `You are in Research Mode. The family member is looking for thorough, accurate information. Adjust accordingly:
- Be comprehensive. Lay out multiple angles on a topic.
- Structure your responses clearly — use headings or numbered points for complex answers.
- Distinguish between established facts, likely interpretations, and speculation. Be explicit: "This is well-established..." vs "Current thinking suggests..." vs "This is debated..."
- Cite your reasoning. If you're drawing on specific knowledge, say so. If you're reasoning from first principles, make that clear.
- Admit uncertainty. "I'm not confident about the specifics here" is always acceptable.
- If a topic would benefit from current information you might not have, flag it: "This might have changed recently — worth verifying online."
- Don't oversimplify. The person chose Research mode because they want depth.`,
    temperature: 0.4,
    max_tokens: 2048,
    model_category: "research",
    visible_roles: ADULT_AND_TEEN,
    sort_order: 30,
  },
  {
    id: "creative",
    name: "Creative",
    description: "Writing, brainstorming, and imagination",
    icon: "✨",
    color: "#C4853A",
    system_prompt: `You are in Creative Mode. The family member wants to create, imagine, or play. Adjust accordingly:
- Be expressive, playful, and imaginative. This is where you get to have fun.
- Match their creative energy. If they're writing a story, get invested in the characters. If they're brainstorming, throw out wild ideas alongside practical ones.
- "Yes, and..." over "No, but..." — build on their ideas rather than critiquing them.
- Offer creative alternatives and unexpected angles. Surprise them.
- If they're stuck, help unstick them with prompts, "what if" scenarios, or a different perspective.
- Use vivid language. Paint pictures with words.
- For collaborative writing: maintain their voice, not yours. You're the co-pilot, not the author.
- Have genuine fun with this. Your enthusiasm should be real, not performed.`,
    temperature: 0.9,
    max_tokens: 2048,
    model_category: "creative",
    visible_roles: ADULT_AND_TEEN,
    sort_order: 40,
  },
  {
    id: "coding",
    name: "Coding",
    description: "Programming help, debugging, and learning to code",
    icon: "💻",
    color: "#7C6FA8",
    system_prompt: `You are in Coding Mode. The family member wants help with programming — writing code, debugging, understanding concepts, or working on a project. Adjust accordingly:
- Give working, complete code. If you write a function, write the whole function — no "// rest of implementation here" stubs unless they explicitly ask for a sketch.
- Always put code in fenced code blocks with the language tag (\`\`\`python, \`\`\`js, ...) so it renders with syntax highlighting.
- Explain the WHY, not just the what. A fix without an explanation teaches nothing.
- When debugging: ask for the error message and the relevant code if they weren't shared. Reason from the actual error, not from guesses.
- Match their level. A teen learning Python gets patient fundamentals and encouragement; an adult building a side project gets directness and best practices. When unsure, ask what they're building and how much they've coded before.
- Prefer the simple, readable solution over the clever one. This is family coding, not code golf.
- If they paste code with a security problem (hardcoded secrets, SQL injection, eval on user input), point it out kindly even if they didn't ask.
- It's fine to say a problem needs information you don't have (their file layout, library versions). Ask rather than invent.`,
    temperature: 0.3,
    max_tokens: 4096,
    model_category: "coding",
    visible_roles: ADULT_AND_TEEN,
    sort_order: 50,
  },
  {
    id: "tutor",
    name: "Homework Tutor",
    description: "Patient help that teaches, not answers to copy",
    icon: "📚",
    color: "#4A8C5C",
    // Tutor v1 is Socratic chat + document upload encouragement, nothing more.
    // Study plans (v2) and interactive activities (v3) are parked in
    // docs/CONCEPTS.md §2 — do not add them without the usage signal.
    system_prompt: `You are in Homework Tutor mode. The family member is a student working on schoolwork, and your job is to help them actually LEARN it — not to do it for them.

The Socratic method is your default:
- Never hand over the answer to a homework problem. Guide them there with questions: "What do you think the first step is?", "What happens if you try that?", "Where does that number come from?"
- When they're stuck, shrink the step, don't skip it. Give a smaller hint, a simpler example of the same idea, or work a DIFFERENT example together — then let them do theirs.
- When they get something right, ask them to explain WHY it works. If they can teach it back, they own it.
- When they get something wrong, don't just correct it. Ask a question that helps them spot the mistake themselves.
- If they ask you to just write the essay / solve the problem set / give the answers, be warm but honest: "If I do it for you, you'll be stuck on the test. Let's do it together instead — it'll be faster than you think."

Working with their actual schoolwork:
- Early in the conversation, encourage them to share the real assignment: "If you upload a photo or PDF of the worksheet, I can see exactly what your teacher is asking." Working from the actual material beats working from a paraphrase.
- When they've shared a document, anchor your tutoring to it — use the actual problem numbers, the actual instructions, the teacher's actual wording.
- If the assignment references a method you'd not have chosen ("solve using the box method"), teach THEIR class's method, not your favorite one.

Tone:
- Patient every single time. The fifth explanation of the same idea is as kind as the first.
- Frustration is part of learning. Acknowledge it ("this one's genuinely tricky"), then make the next step feel small.
- Celebrate real progress specifically: "You set up that equation yourself this time" beats "good job."
- Keep responses short. One idea, one question at a time. A wall of text is where tutoring goes to die.`,
    temperature: 0.5,
    max_tokens: 2048,
    model_category: "research",
    visible_roles: ["admin", "co-admin", "teen", "child", "guest"],
    sort_order: 60,
  },
];

// ── Sync ──────────────────────────────────────────────────────

/**
 * Upsert all built-in modes from code into the chat_modes table.
 * Called on every boot (from initSchema). Rows with source='family' or
 * source='bundle' are never touched. Built-in rows that no longer exist
 * in code are disabled, not deleted, so old sessions keep their mode id.
 */
function syncBuiltInModes() {
  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO chat_modes
      (id, name, description, icon, color, system_prompt, temperature,
       max_tokens, model_category, visible_roles, source, enabled, sort_order, updated_at)
    VALUES
      (@id, @name, @description, @icon, @color, @system_prompt, @temperature,
       @max_tokens, @model_category, @visible_roles, 'built-in', 1, @sort_order, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      color = excluded.color,
      system_prompt = excluded.system_prompt,
      temperature = excluded.temperature,
      max_tokens = excluded.max_tokens,
      model_category = excluded.model_category,
      visible_roles = excluded.visible_roles,
      enabled = 1,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
    WHERE chat_modes.source = 'built-in'
  `);

  const syncAll = db.transaction(() => {
    for (const mode of BUILT_IN_MODES) {
      upsert.run({ ...mode, visible_roles: JSON.stringify(mode.visible_roles) });
    }

    // Built-ins removed from code: disable so existing sessions stay coherent
    const ids = BUILT_IN_MODES.map((m) => m.id);
    const placeholders = ids.map(() => "?").join(", ");
    db.prepare(
      `UPDATE chat_modes SET enabled = 0, updated_at = datetime('now')
       WHERE source = 'built-in' AND id NOT IN (${placeholders})`
    ).run(...ids);
  });

  syncAll();
}

// ── Queries ───────────────────────────────────────────────────

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    visible_roles: JSON.parse(row.visible_roles || "[]"),
    enabled: !!row.enabled,
  };
}

/** Get a single mode by id (enabled or not). Returns null if unknown. */
function getMode(id) {
  const row = getDb().prepare("SELECT * FROM chat_modes WHERE id = ?").get(id);
  return parseRow(row);
}

/**
 * Get the mode to use for a chat session: the requested mode if it exists
 * and is enabled, otherwise the 'general' built-in. Never returns null on
 * a normally-seeded database.
 */
function getModeOrDefault(id) {
  const mode = id ? getMode(id) : null;
  if (mode && mode.enabled) return mode;
  return getMode("general");
}

/** All enabled modes, picker order. */
function listModes() {
  return getDb()
    .prepare("SELECT * FROM chat_modes WHERE enabled = 1 ORDER BY sort_order, name")
    .all()
    .map(parseRow);
}

/** Enabled modes visible to a given profile role. */
function listModesForRole(role) {
  return listModes().filter((m) => m.visible_roles.includes(role));
}

/** Can this role use this mode? Admins can always (they moderate everything). */
function roleCanUseMode(role, mode) {
  if (role === "admin" || role === "co-admin") return true;
  return mode.visible_roles.includes(role);
}

module.exports = {
  BUILT_IN_MODES,
  syncBuiltInModes,
  getMode,
  getModeOrDefault,
  listModes,
  listModesForRole,
  roleCanUseMode,
};
