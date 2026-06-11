import { useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import sql from "highlight.js/lib/languages/sql";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("sql", sql);

const LANG_ALIASES = {
  js: "javascript", jsx: "javascript", mjs: "javascript", node: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python", python3: "python",
  rs: "rust",
  golang: "go",
  sh: "bash", shell: "bash", zsh: "bash", console: "bash",
  html: "xml", svg: "xml",
  "c++": "cpp", c: "cpp", h: "cpp", hpp: "cpp",
};

function resolveLanguage(lang) {
  if (!lang) return null;
  const normalized = LANG_ALIASES[lang.toLowerCase()] || lang.toLowerCase();
  return hljs.getLanguage(normalized) ? normalized : null;
}

/**
 * Split message text into alternating text / fenced-code segments.
 * An unterminated fence (mid-stream) is treated as code so highlighting
 * appears live while the model is still typing.
 */
function parseSegments(text) {
  const segments = [];
  const fence = /```([^\n`]*)\n?/g;
  let pos = 0;

  while (pos < text.length) {
    fence.lastIndex = pos;
    const open = fence.exec(text);
    if (!open) {
      segments.push({ type: "text", content: text.slice(pos) });
      break;
    }
    if (open.index > pos) {
      segments.push({ type: "text", content: text.slice(pos, open.index) });
    }
    const bodyStart = open.index + open[0].length;
    const close = text.indexOf("\n```", bodyStart - 1);
    if (close === -1) {
      segments.push({ type: "code", lang: open[1].trim(), content: text.slice(bodyStart) });
      break;
    }
    segments.push({ type: "code", lang: open[1].trim(), content: text.slice(bodyStart, close) });
    pos = close + 4;
    // Skip a trailing newline right after the closing fence
    if (text[pos] === "\n") pos += 1;
  }

  return segments;
}

/** Render a plain-text segment, styling `inline code` spans. */
function TextSegment({ content }) {
  const parts = content.split(/(`[^`\n]+`)/g);
  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={i} className="kw-inline-code">{part.slice(1, -1)}</code>
        ) : (
          part
        )
      )}
    </span>
  );
}

function CodeBlock({ lang, content }) {
  const [copied, setCopied] = useState(false);
  const language = resolveLanguage(lang);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. non-secure context on LAN) — no-op
    }
  };

  return (
    <div className="kw-code-block">
      <div className="kw-code-header">
        <span className="kw-code-lang">{language || lang || "code"}</span>
        <button className="kw-code-copy" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      {language ? (
        // hljs output is HTML-escaped by highlight.js itself — safe to inject
        <pre>
          <code
            dangerouslySetInnerHTML={{
              __html: hljs.highlight(content, { language }).value,
            }}
          />
        </pre>
      ) : (
        <pre><code>{content}</code></pre>
      )}
    </div>
  );
}

/**
 * Chat message body: markdown-style fenced code blocks get syntax
 * highlighting + a copy button; everything else renders as plain text
 * with `inline code` styling. Works mid-stream (unterminated fences).
 */
export function MessageContent({ text }) {
  if (!text) return null;
  if (!text.includes("`")) return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;

  return (
    <>
      {parseSegments(text).map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} lang={seg.lang} content={seg.content} />
        ) : (
          <TextSegment key={i} content={seg.content} />
        )
      )}
    </>
  );
}
