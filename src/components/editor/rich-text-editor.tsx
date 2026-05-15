"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, AlignLeft, AlignCenter, AlignRight,
  Highlighter, Undo, Redo, Palette, Type, Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";

const COLORS = [
  { label: "Padrao", value: "inherit" },
  { label: "Vermelho", value: "#dc2626" },
  { label: "Laranja", value: "#ea580c" },
  { label: "Amarelo", value: "#ca8a04" },
  { label: "Verde", value: "#16a34a" },
  { label: "Azul", value: "#2563eb" },
  { label: "Violeta", value: "#7c3aed" },
  { label: "Rosa", value: "#db2777" },
];

const HIGHLIGHTS = [
  { label: "Nenhum", value: "" },
  { label: "Amarelo", value: "#fef08a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" },
  { label: "Rosa", value: "#fecdd3" },
  { label: "Roxo", value: "#ddd6fe" },
];

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, active, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-md transition-all",
        "hover:bg-muted text-muted-foreground hover:text-foreground",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        active && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, editable = true, placeholder = "Comece a escrever..." }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[280px] px-5 py-4",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  const setColor = useCallback((color: string) => {
    if (!editor) return;
    if (color === "inherit") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
  }, [editor]);

  const setHighlight = useCallback((color: string) => {
    if (!editor) return;
    if (!color) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="border-b bg-muted/30 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
          {/* Text formatting */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italico">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Riscado">
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragrafo">
            <Pilcrow className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1">
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3">
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Alignment */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar esquerda">
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar direita">
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Colors */}
          <div className="relative group">
            <ToolbarButton onClick={() => {}} title="Cor do texto">
              <Palette className="h-3.5 w-3.5" />
            </ToolbarButton>
            <div className="absolute top-full left-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 hidden group-hover:flex gap-1 z-50">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value === "inherit" ? "transparent" : c.value }}
                >
                  {c.value === "inherit" && <Type className="h-3 w-3 mx-auto text-muted-foreground" />}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight */}
          <div className="relative group">
            <ToolbarButton onClick={() => {}} active={editor.isActive("highlight")} title="Destaque">
              <Highlighter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <div className="absolute top-full left-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 hidden group-hover:flex gap-1 z-50">
              {HIGHLIGHTS.map((h) => (
                <button
                  key={h.value || "none"}
                  type="button"
                  onClick={() => setHighlight(h.value)}
                  title={h.label}
                  className={cn(
                    "h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform",
                    !h.value && "bg-transparent"
                  )}
                  style={h.value ? { backgroundColor: h.value } : undefined}
                >
                  {!h.value && <Minus className="h-3 w-3 mx-auto text-muted-foreground" />}
                </button>
              ))}
            </div>
          </div>

          <ToolbarSep />

          {/* Undo/Redo */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer">
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer">
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

/** Read-only HTML viewer */
export function RichTextViewer({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-5 py-4",
      },
    },
  });

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <EditorContent editor={editor} />
    </div>
  );
}
