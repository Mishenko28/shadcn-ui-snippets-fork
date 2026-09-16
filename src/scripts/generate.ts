#!/usr/bin/env bun

import fs from "node:fs"
import path from "node:path"

const COMPONENTS_DIR = "src/components"
const DIST_DIR = "dist"

// Sections in each component .md file are separated by "---".
const SECTION_DELIMITER = "---"

// Within a section, the delimiter between the variant label and its
// code block, e.g. "import -\n\n```jsx\n<code>\n```"
const HEADER_BODY_DELIMITER = " -\n\n```jsx\n"

/**
 * Each file in src/components/*.md contains one or more sections like:
 *
 *   <variant> -
 *
 *   ```jsx
 *   <code>
 *   ```
 *
 * Known variants are "import", "default", "state", "zod" — but any other
 * word (e.g. "expanded") is also valid and falls back to a generic prefix.
 * The "import" variant becomes an import snippet; everything else becomes
 * a usage snippet.
 */

interface Snippet {
  prefix: string[]
  body: string[]
  description: string
}

type SnippetMap = Record<string, Snippet>

interface ParsedSection {
  variant: string
  codeLines: string[]
}

/** Single-letter code used in both the "cn*" and "shadcn-*" prefixes. */
const PREFIX_LETTER: Record<string, string> = {
  import: "i",
  default: "x",
  state: "s",
  zod: "z",
}

/**
 * Splits a component file's raw content into its variant sections.
 * Sections that don't match the expected shape (e.g. empty sections left
 * over from a leading/trailing "---") are silently skipped; sections with
 * content that still fail to parse are logged and skipped.
 */
function parseSections(fileContent: string, fileName: string): ParsedSection[] {
  return fileContent
    .split(SECTION_DELIMITER)
    .map((section) => section.trim())
    .filter((section) => section.length > 0)
    .flatMap((section) => {
      const [header, code] = section.split(HEADER_BODY_DELIMITER)

      if (!header || !code) {
        console.warn(`Skipping unparseable section in ${fileName}`)
        return []
      }

      return [
        {
          variant: header.trim(),
          codeLines: code.split("\n").slice(0, -1), // drop the closing ```
        },
      ]
    })
}

/** e.g. ("accordion", "import") -> "Accordion", ("accordion", "state") -> "Accordion State" */
function buildSnippetTitle(componentName: string, variant: string): string {
  return `${componentName.replace("-", " ")} ${variant}`
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
    .replace("Import", "")
    .replace("Default", "")
    .trim()
}

/** e.g. ("accordion", "state") -> ["cns-accordion", "shadcn-s-accordion"] */
function buildSnippetPrefixes(
  componentName: string,
  variant: string,
): string[] {
  const letter = PREFIX_LETTER[variant] ?? "x"
  const isKnownVariant = variant in PREFIX_LETTER
  const suffix = isKnownVariant ? "" : `-${variant.replace(/ /g, "-")}`
  const base = `${componentName}${suffix}`

  return [`cn${letter}-${base}`, `shadcn-${letter}-${base}`]
}

/** Reads every component file and splits their sections into import/usage snippet maps. */
function collectSnippets(componentsDir: string): {
  importSnippets: SnippetMap
  usageSnippets: SnippetMap
} {
  const importSnippets: SnippetMap = {}
  const usageSnippets: SnippetMap = {}

  for (const fileName of fs.readdirSync(componentsDir)) {
    const componentName = path.parse(fileName).name
    const fileContent = fs
      .readFileSync(path.join(componentsDir, fileName), "utf8")
      .replace(/\r\n/g, "\n")

    for (const { variant, codeLines } of parseSections(fileContent, fileName)) {
      const title = buildSnippetTitle(componentName, variant)
      const snippet: Snippet = {
        prefix: buildSnippetPrefixes(componentName, variant),
        body: codeLines,
        description: `https://ui.shadcn.com/docs/components/${componentName}`,
      }

      const target = variant === "import" ? importSnippets : usageSnippets
      target[title] = snippet
    }
  }

  return { importSnippets, usageSnippets }
}

/** Alphabetizes by title and drops entries with an empty code body. */
function sortAndPrune(snippets: SnippetMap): SnippetMap {
  return Object.fromEntries(
    Object.entries(snippets)
      .filter(([, snippet]) => snippet.body[0] !== "")
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  )
}

function writeSnippetFile(fileName: string, snippets: SnippetMap): void {
  fs.writeFileSync(
    path.join(DIST_DIR, fileName),
    JSON.stringify(snippets, null, 2),
  )
}

function main(): void {
  const { importSnippets, usageSnippets } = collectSnippets(COMPONENTS_DIR)

  fs.mkdirSync(DIST_DIR, { recursive: true })
  writeSnippetFile("import.code-snippets", sortAndPrune(importSnippets))
  writeSnippetFile("usage.code-snippets", sortAndPrune(usageSnippets))
}

main()
