'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function TB({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState('');

  function openLinkDialog() {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setUrl(editor.getAttributes('link').href ?? 'https://');
    setLinkOpen(true);
  }

  function applyLink() {
    const href = url.trim();
    if (href) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
      <TB label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </TB>
      <TB label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </TB>
      <TB label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </TB>
      <TB label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </TB>
      <TB label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List />
      </TB>
      <TB label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered />
      </TB>
      <TB label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote />
      </TB>

      <span className="mx-1 h-5 w-px bg-border" />

      <TB label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft />
      </TB>
      <TB label="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter />
      </TB>
      <TB label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight />
      </TB>
      <TB label="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
        <AlignJustify />
      </TB>

      <span className="mx-1 h-5 w-px bg-border" />

      <TB label="Link" active={editor.isActive('link')} onClick={openLinkDialog}>
        {editor.isActive('link') ? <Link2Off /> : <Link2 />}
      </TB>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rte-link">URL</Label>
            <Input
              id="rte-link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="button" onClick={applyLink}>
              Add link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write the article…',
  minHeightClass = 'min-h-64',
  syncSignal,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  /** Bump this to push an external `value` into the editor (e.g. AI insert). */
  syncSignal?: number;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `article-content ${minHeightClass} px-3 py-2 text-sm outline-none`,
      },
    },
  });

  // Programmatic value pushes (AI generate / variable insert) — not on typing.
  useEffect(() => {
    if (editor && syncSignal !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [syncSignal, editor, value]);

  if (!editor) {
    return <div className={`${minHeightClass} rounded-md border bg-transparent`} />;
  }

  return (
    <div className="rounded-md border bg-transparent focus-within:border-ring">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
