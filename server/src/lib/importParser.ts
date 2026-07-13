import { marked, Token, Tokens } from "marked";

type TiptapNode = { type: string; attrs?: Record<string, unknown>; content?: TiptapNode[]; text?: string; marks?: { type: string }[] };

function inlineTokensToNodes(tokens: Token[]): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "strong":
        for (const n of inlineTokensToNodes((token as Tokens.Strong).tokens)) {
          nodes.push({ ...n, marks: [...(n.marks || []), { type: "bold" }] });
        }
        break;
      case "em":
        for (const n of inlineTokensToNodes((token as Tokens.Em).tokens)) {
          nodes.push({ ...n, marks: [...(n.marks || []), { type: "italic" }] });
        }
        break;
      case "text":
      case "codespan":
        nodes.push({ type: "text", text: (token as Tokens.Text).text });
        break;
      default:
        if ("text" in token && typeof (token as { text?: string }).text === "string") {
          nodes.push({ type: "text", text: (token as { text: string }).text });
        }
    }
  }
  return nodes.length ? nodes : [{ type: "text", text: "" }];
}

function headingLevel(depth: number) {
  return Math.min(Math.max(depth, 1), 6);
}

export function markdownToTiptapDoc(markdown: string): TiptapNode {
  const tokens = marked.lexer(markdown);
  const content: TiptapNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const t = token as Tokens.Heading;
        content.push({
          type: "heading",
          attrs: { level: headingLevel(t.depth) },
          content: inlineTokensToNodes(t.tokens),
        });
        break;
      }
      case "paragraph": {
        const t = token as Tokens.Paragraph;
        content.push({ type: "paragraph", content: inlineTokensToNodes(t.tokens) });
        break;
      }
      case "list": {
        const t = token as Tokens.List;
        const listType = t.ordered ? "orderedList" : "bulletList";
        content.push({
          type: listType,
          content: t.items.map((item: Tokens.ListItem) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: inlineTokensToNodes(
                  item.tokens.filter((tk: Token) => tk.type === "text")
                ),
              },
            ],
          })),
        });
        break;
      }
      case "space":
        break;
      default:
        if ("text" in token && typeof (token as { text?: string }).text === "string") {
          const text = (token as { text: string }).text;
          if (text.trim()) {
            content.push({ type: "paragraph", content: [{ type: "text", text }] });
          }
        }
    }
  }

  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

export function plainTextToTiptapDoc(text: string): TiptapNode {
  const paragraphs = text.split(/\r?\n/);
  const content: TiptapNode[] = paragraphs.map((line) =>
    line.trim()
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" }
  );
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
