/**
 * Enforces spec section 33 against the Viewer source entry: starting from
 * src/viewer-entry.ts, walk every file reachable through relative runtime
 * imports and fail if any of them imports an editor-only runtime.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ENTRY = resolve("src/viewer-entry.ts");

// Specifiers the Viewer's STATIC import graph must never reach. Matching is
// on the full specifier, not a prefix ("mathlive" is forbidden, "mathlive/ssr"
// is fine).
const FORBIDDEN = new Map([
  ["@tiptap/react", "Tiptap's React editor runtime / NodeView machinery"],
  ["@tiptap/pm/state", "ProseMirror editing state"],
  ["@tiptap/pm/view", "ProseMirror EditorView"],
  ["mathlive", "MathLive's interactive <math-field> custom element (use mathlive/ssr)"],
  ["@ant-design/icons", "editor toolbar icons"],
  // CodeBlock: the Viewer highlights with lazily-loaded language packages
  // only. None of CodeMirror may be statically reachable.
  ["@codemirror/view", "CodeMirror's editor view"],
  ["@codemirror/state", "CodeMirror's editor state"],
  ["@codemirror/commands", "CodeMirror's editing commands"],
  ["@codemirror/autocomplete", "CodeMirror's autocomplete/bracket closing"],
  ["@codemirror/language", "CodeMirror's language layer (statically drags in view/state)"],
  ["@codemirror/language-data", "all ~140 CodeMirror languages (must stay behind import())"],
  ["@lezer/highlight", "Lezer highlighter (must stay behind import())"],
]);

// Dynamic import("pkg") from the Viewer is allowed — that's how highlighting
// loads on demand — but only for these.
const ALLOWED_DYNAMIC = new Set(["@codemirror/language-data", "@lezer/highlight"]);

if (!existsSync(ENTRY)) {
  console.error(`✗ ${ENTRY} not found.`);
  process.exit(2);
}

const resolveRelative = (fromFile, spec) => {
  const base = resolve(dirname(fromFile), spec);
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, resolve(base, "index.ts"), resolve(base, "index.tsx")]) {
    if (existsSync(cand)) return cand;
  }
  return null;
};

// Strip comments and type-only imports/exports so only runtime edges are walked.
const stripNonRuntime = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\b(?:import|export)\s+type\s+[\s\S]*?from\s*["'][^"']+["']\s*;?/g, "");

// Matches `from "x"`, `from 'x'`, and bare `import "x"` / `import 'x'`.
const STATIC_RE = /(?:from|import)\s*(["'])([^"']+)\1/g;
// Matches `import("x")` (also `import('x')`).
const DYNAMIC_RE = /\bimport\(\s*(["'])([^"']+)\1\s*\)/g;

const seen = new Set();
const violations = [];
const dynamicPackages = new Map(); // specifier -> first file importing it

const walk = (file, via) => {
  if (seen.has(file)) return;
  seen.add(file);
  const src = stripNonRuntime(readFileSync(file, "utf8"));
  for (const m of src.matchAll(STATIC_RE)) {
    const spec = m[2];
    if (spec.startsWith(".")) {
      const next = resolveRelative(file, spec);
      if (next) walk(next, [...via, file]);
    } else if (FORBIDDEN.has(spec)) {
      violations.push({ spec, file, via: [...via, file], kind: "static" });
    }
  }
  for (const m of src.matchAll(DYNAMIC_RE)) {
    const spec = m[2];
    if (spec.startsWith(".")) {
      const next = resolveRelative(file, spec);
      if (next) walk(next, [...via, file]);
    } else {
      if (!dynamicPackages.has(spec)) dynamicPackages.set(spec, [...via, file]);
      if (!ALLOWED_DYNAMIC.has(spec) && FORBIDDEN.has(spec)) {
        violations.push({ spec, file, via: [...via, file], kind: "dynamic" });
      }
    }
  }
};

walk(ENTRY, []);

const rel = (p) => p.replace(resolve(".") + "/", "").replace(resolve(".") + "\\", "");
if (violations.length) {
  console.error("✗ Viewer entry reaches editor-only runtime(s):\n");
  for (const v of violations) {
    console.error(`  "${v.spec}" (${v.kind} import) — ${FORBIDDEN.get(v.spec)}`);
    console.error(`    import chain: ${v.via.map(rel).join(" -> ")}\n`);
  }
  process.exit(1);
}
const lazy = [...dynamicPackages.keys()];
console.log(
  `✔ Viewer entry clean: ${seen.size} file(s) reachable from src/viewer-entry.ts; none statically import ${[...FORBIDDEN.keys()].join(", ")}`,
);
console.log(
  lazy.length
    ? `  lazy (import() on demand): ${lazy.join(", ")}`
    : "  lazy (import() on demand): none",
);
