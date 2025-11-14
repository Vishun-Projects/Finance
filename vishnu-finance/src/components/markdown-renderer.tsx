'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer for chat messages
 * Handles: bold, italic, code, lists, line breaks, icons, headings, horizontal rules
 * 
 * Icon syntax: :icon-name: (e.g., :heart:, :trending-up:, :check-circle:)
 * Icons are rendered using lucide-react icons
 * 
 * Headings: # H1, ## H2, ### H3
 * Horizontal rules: ---
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Split content into lines for processing
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const processLine = (line: string, index: number) => {
    const trimmed = line.trim();
    
    // Empty line - close list if open, add paragraph break
    if (trimmed === '') {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 ml-4">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
      return;
    }

    // Check for horizontal rule (---, ***, or ___)
    const hrMatch = trimmed.match(/^(-{3,}|\*{3,}|_{3,})$/);
    if (hrMatch) {
      // Close list if open
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 ml-4">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
      elements.push(
        <hr key={`hr-${index}`} className="my-4 border-border" />
      );
      return;
    }

    // Check for headings (# H1, ## H2, ### H3, etc.)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      // Close list if open
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 ml-4">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
      
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const processed = processInlineMarkdown(headingText);
      
      const headingClasses = {
        1: 'text-2xl font-bold my-4',
        2: 'text-xl font-bold my-3',
        3: 'text-lg font-semibold my-3',
        4: 'text-base font-semibold my-2',
        5: 'text-sm font-semibold my-2',
        6: 'text-sm font-medium my-2',
      };
      
      const className = headingClasses[level as keyof typeof headingClasses] || headingClasses[6];
      
      // Render heading based on level
      if (level === 1) {
        elements.push(<h1 key={`heading-${index}`} className={className}>{processed}</h1>);
      } else if (level === 2) {
        elements.push(<h2 key={`heading-${index}`} className={className}>{processed}</h2>);
      } else if (level === 3) {
        elements.push(<h3 key={`heading-${index}`} className={className}>{processed}</h3>);
      } else if (level === 4) {
        elements.push(<h4 key={`heading-${index}`} className={className}>{processed}</h4>);
      } else if (level === 5) {
        elements.push(<h5 key={`heading-${index}`} className={className}>{processed}</h5>);
      } else {
        elements.push(<h6 key={`heading-${index}`} className={className}>{processed}</h6>);
      }
      return;
    }

    // Check if it's a list item (starts with -, *, or number)
    const listMatch = trimmed.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const itemContent = processInlineMarkdown(listMatch[2]);
      listItems.push(
        <li key={`item-${index}`} className="ml-2">
          {itemContent}
        </li>
      );
      inList = true;
      return;
    }

    // Close list if we encounter a non-list line
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 ml-4">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }

    // Process paragraph with inline markdown
    const processed = processInlineMarkdown(trimmed);
    elements.push(
      <p key={`para-${index}`} className="my-2">
        {processed}
      </p>
    );
  };

  // Process all lines
  lines.forEach((line, index) => {
    processLine(line, index);
  });

  // Close any remaining list
  if (inList && listItems.length > 0) {
    elements.push(
      <ul key="list-final" className="list-disc list-inside space-y-1 my-2 ml-4">
        {listItems}
      </ul>
    );
  }

  return <div className={`markdown-content ${className}`}>{elements}</div>;
}

/**
 * Convert kebab-case icon name to PascalCase (e.g., "trending-up" -> "TrendingUp")
 */
function kebabToPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Get Lucide icon component by name
 */
function getIconComponent(iconName: string): React.ComponentType<{ className?: string; size?: number }> | null {
  const pascalName = kebabToPascalCase(iconName);
  const IconComponent = (LucideIcons as any)[pascalName];
  return IconComponent || null;
}

/**
 * Process inline markdown: bold, italic, code, icons
 */
function processInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Pattern for markdown: **bold**, *italic*, `code`, :icon-name:
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
    { regex: /\*([^*]+)\*/g, type: 'italic' },
    { regex: /`([^`]+)`/g, type: 'code' },
    { regex: /:([a-z0-9-]+):/g, type: 'icon' },
  ];

  // Find all matches
  const matches: Array<{ start: number; end: number; type: string; content: string }> = [];
  
  patterns.forEach(({ regex, type }) => {
    let match;
    regex.lastIndex = 0; // Reset regex
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
        content: match[1],
      });
    }
  });

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep first one)
  const nonOverlapping: typeof matches = [];
  for (const match of matches) {
    const overlaps = nonOverlapping.some(
      (m) => !(match.end <= m.start || match.start >= m.end)
    );
    if (!overlaps) {
      nonOverlapping.push(match);
    }
  }

  // Build React elements
  let lastIndex = 0;
  nonOverlapping.forEach((match) => {
    // Add text before match
    if (match.start > lastIndex) {
      const beforeText = text.substring(lastIndex, match.start);
      if (beforeText) {
        parts.push(<span key={key++}>{beforeText}</span>);
      }
    }

    // Add matched content with appropriate styling
    if (match.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold">{match.content}</strong>);
    } else if (match.type === 'italic') {
      parts.push(<em key={key++} className="italic">{match.content}</em>);
    } else if (match.type === 'code') {
      parts.push(
        <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
          {match.content}
        </code>
      );
    } else if (match.type === 'icon') {
      const IconComponent = getIconComponent(match.content);
      if (IconComponent) {
        parts.push(
          <IconComponent 
            key={key++} 
            className="inline-block align-middle mx-0.5" 
            size={16}
            aria-label={match.content}
          />
        );
      } else {
        // If icon not found, render as text
        parts.push(<span key={key++}>:{match.content}:</span>);
      }
    }

    lastIndex = match.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
}

