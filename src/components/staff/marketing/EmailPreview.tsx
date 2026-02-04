import { EmailBlock } from './EmailBlockEditor';

interface EmailPreviewProps {
  subject: string;
  blocks: EmailBlock[];
}

export const EmailPreview = ({ subject, blocks }: EmailPreviewProps) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Email Header */}
      <div className="bg-muted px-4 py-3 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Subject:</span>
          <span className="font-medium">{subject || '(No subject)'}</span>
        </div>
      </div>

      {/* Email Body */}
      <div className="bg-white p-6 min-h-[300px]">
        {blocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No content to preview
          </div>
        ) : (
          <div className="space-y-4 max-w-[600px] mx-auto">
            {blocks.map((block) => (
              <PreviewBlock key={block.id} block={block} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-muted/50 px-4 py-3 border-t text-center text-xs text-muted-foreground">
        <p>This is a preview. Dynamic variables will be replaced when sent.</p>
      </div>
    </div>
  );
};

const PreviewBlock = ({ block }: { block: EmailBlock }) => {
  const highlightVariables = (text: string) => {
    // Highlight {{variables}} in the preview
    return text.split(/(\{\{[^}]+\}\})/).map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return (
          <span key={i} className="bg-primary/20 text-primary rounded px-1 font-mono text-sm">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  switch (block.type) {
    case 'heading':
      return (
        <h2 className="text-2xl font-bold text-gray-900">
          {highlightVariables(block.content || '')}
        </h2>
      );

    case 'text':
      return (
        <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {highlightVariables(block.content || '')}
        </p>
      );

    case 'button':
      return (
        <div className={`text-${block.align || 'left'}`}>
          <a
            href={block.buttonUrl || '#'}
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            {block.buttonText || 'Button'}
          </a>
        </div>
      );

    case 'image':
      if (!block.url) {
        return (
          <div className="bg-muted rounded-lg h-32 flex items-center justify-center text-muted-foreground">
            Image placeholder
          </div>
        );
      }
      return (
        <img
          src={block.url}
          alt={block.alt || ''}
          className="max-w-full h-auto rounded"
        />
      );

    case 'divider':
      return <hr className="border-border" />;

    case 'spacer':
      return <div className="h-8" />;

    default:
      return null;
  }
};
