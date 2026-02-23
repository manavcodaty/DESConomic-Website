"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { UIButton } from "@/components/ui-button";

type Props = {
  value: unknown;
  onChange: (value: unknown) => void;
  onImageUpload: (file: File) => Promise<string | null>;
};

export function TiptapEditor({ value, onChange, onImageUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false
      }),
      Image,
      Placeholder.configure({
        placeholder: "Write your article body..."
      })
    ],
    content: value as any,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] rounded-b-md border-x border-b border-[var(--line)] bg-white p-4 outline-none prose-editorial"
      }
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON());
    }
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value as never);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-t-md border border-[var(--line)] bg-[#fafafa] p-2">
        <UIButton className="h-8 border-black bg-black px-3 text-xs" type="button" onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </UIButton>
        <UIButton className="h-8 border-black bg-black px-3 text-xs" type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </UIButton>
        <UIButton className="h-8 border-black bg-black px-3 text-xs" type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </UIButton>
        <UIButton className="h-8 border-black bg-black px-3 text-xs" type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          Quote
        </UIButton>
        <UIButton className="h-8 border-black bg-black px-3 text-xs" type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          List
        </UIButton>
        <UIButton
          className="h-8 border-black bg-black px-3 text-xs"
          type="button"
          onClick={() => {
            const href = window.prompt("Enter URL");
            if (!href) return;
            editor.chain().focus().setLink({ href }).run();
          }}
        >
          Link
        </UIButton>
        <UIButton className="h-8 border-black bg-black px-3 text-xs" type="button" onClick={() => fileRef.current?.click()}>
          Image
        </UIButton>
        <input
          ref={fileRef}
          hidden
          accept="image/*"
          type="file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const src = await onImageUpload(file);
            if (src) {
              editor.chain().focus().setImage({ src, alt: file.name }).run();
            }
            event.currentTarget.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
