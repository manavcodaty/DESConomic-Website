import Image from "next/image";
import Link from "next/link";

type Node = {
  type?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  text?: string;
  content?: Node[];
};

function renderText(node: Node, key: string) {
  let element: React.ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") {
      element = <strong key={`${key}-b`}>{element}</strong>;
    }
    if (mark.type === "italic") {
      element = <em key={`${key}-i`}>{element}</em>;
    }
    if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "#");
      element = (
        <Link key={`${key}-l`} className="underline decoration-[var(--accent)]" href={href} target="_blank">
          {element}
        </Link>
      );
    }
  }

  return <>{element}</>;
}

function renderChildren(nodes: Node[] | undefined, prefix: string) {
  if (!nodes) return null;
  return nodes.map((node, index) => renderNode(node, `${prefix}-${index}`));
}

function renderNode(node: Node, key: string): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderChildren(node.content, key)}</p>;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 2) return <h2 key={key}>{renderChildren(node.content, key)}</h2>;
      if (level === 3) return <h3 key={key}>{renderChildren(node.content, key)}</h3>;
      return <h4 key={key}>{renderChildren(node.content, key)}</h4>;
    }
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node.content, key)}</blockquote>;
    case "bulletList":
      return <ul key={key}>{renderChildren(node.content, key)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderChildren(node.content, key)}</ol>;
    case "listItem":
      return <li key={key}>{renderChildren(node.content, key)}</li>;
    case "image": {
      const src = String(node.attrs?.src ?? "");
      const alt = String(node.attrs?.alt ?? "Article image");
      return (
        <div key={key} className="my-6 overflow-hidden rounded-md border border-[var(--line)]">
          <Image alt={alt} className="h-auto w-full object-cover" height={720} src={src} width={1280} />
        </div>
      );
    }
    case "text":
      return <span key={key}>{renderText(node, key)}</span>;
    default:
      return <div key={key}>{renderChildren(node.content, key)}</div>;
  }
}

export function TiptapRenderer({ doc }: { doc: Node | null | undefined }) {
  if (!doc?.content) {
    return <p>No content yet.</p>;
  }

  return <div className="prose-editorial">{renderChildren(doc.content, "root")}</div>;
}
