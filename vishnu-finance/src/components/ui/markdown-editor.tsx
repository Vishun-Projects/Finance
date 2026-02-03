'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, List, Table as TableIcon, Code, Heading1, Heading2, Eye, Edit2, Link as LinkIcon, Quote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    rows?: number;
}

export function MarkdownEditor({ value, onChange, className, rows = 12 }: MarkdownEditorProps) {
    const [activeTab, setActiveTab] = useState('write');

    const insertText = (before: string, after: string = '') => {
        const textarea = document.querySelector('textarea.markdown-input') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
        onChange(newText);

        // Restore focus (timeout needed for React re-render)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const insertTable = () => {
        const tableTemplate = `
| Header 1 | Header 2 | Header 3 |
| :--- | :---: | ---: |
| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |
| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |
`;
        insertText(tableTemplate);
    };

    return (
        <div className={cn("border border-border rounded-lg overflow-hidden bg-background", className)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/40">
                    <TabsList className="h-8">
                        <TabsTrigger value="write" className="h-7 text-xs px-2"><Edit2 className="w-3 h-3 mr-1" /> Write</TabsTrigger>
                        <TabsTrigger value="preview" className="h-7 text-xs px-2"><Eye className="w-3 h-3 mr-1" /> Preview</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText('# ')} title="Heading 1">
                            <Heading1 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText('## ')} title="Heading 2">
                            <Heading2 className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText('**', '**')} title="Bold">
                            <Bold className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText('*', '*')} title="Italic">
                            <Italic className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText('- ')} title="List">
                            <List className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText('> ')} title="Quote">
                            <Quote className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText('`', '`')} title="Code">
                            <Code className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => insertText('[', '](url)')} title="Link">
                            <LinkIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={insertTable} title="Insert Table">
                            <TableIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <TabsContent value="write" className="m-0">
                    <Textarea
                        className="markdown-input min-h-[300px] border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm leading-relaxed resize-y"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Write your markdown content here..."
                        rows={rows}
                    />
                </TabsContent>

                <TabsContent value="preview" className="m-0 p-6 min-h-[300px] prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-[600px]">
                    <ReactMarkdown
                        components={{
                            table: ({ node, ...props }) => <table className="border-collapse table-auto w-full text-sm" {...props} />,
                            th: ({ node, ...props }) => <th className="border-b border-border font-medium p-4 pl-8 pt-0 pb-3 text-left" {...props} />,
                            td: ({ node, ...props }) => <td className="border-b border-border p-4 pl-8 pt-0 pb-3 text-left" {...props} />,
                        }}
                    >
                        {value}
                    </ReactMarkdown>
                </TabsContent>
            </Tabs>
            <div className="px-3 py-1 bg-muted/20 border-t border-border text-[10px] text-muted-foreground flex justify-between">
                <span>Markdown Supported</span>
                <span>{value.length} chars</span>
            </div>
        </div>
    );
}
