import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  GripVertical, 
  Trash2, 
  Type, 
  Image, 
  Square, 
  Minus,
  Plus,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { DynamicVariableInsert } from './DynamicVariableInsert';
import { cn } from '@/lib/utils';

export interface EmailBlock {
  id: string;
  type: 'text' | 'heading' | 'button' | 'image' | 'divider' | 'spacer';
  content?: string;
  url?: string;
  alt?: string;
  buttonText?: string;
  buttonUrl?: string;
  align?: 'left' | 'center' | 'right';
}

interface EmailBlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
}

const BLOCK_TYPES = [
  { type: 'heading', icon: Type, label: 'Heading' },
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'button', icon: Square, label: 'Button' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'divider', icon: Minus, label: 'Divider' },
  { type: 'spacer', icon: Square, label: 'Spacer' },
] as const;

export const EmailBlockEditor = ({ blocks, onChange }: EmailBlockEditorProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type,
      content: type === 'heading' ? 'Your Heading' : type === 'text' ? '' : undefined,
      buttonText: type === 'button' ? 'Click Here' : undefined,
      buttonUrl: type === 'button' ? 'https://' : undefined,
      url: type === 'image' ? '' : undefined,
      alt: type === 'image' ? '' : undefined,
      align: 'left',
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(dropIndex, 0, removed);
    onChange(newBlocks);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleInsertVariable = useCallback((blockId: string, variable: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      updateBlock(blockId, { content: (block.content || '') + `{{${variable}}}` });
    }
  }, [blocks]);

  return (
    <div className="space-y-4">
      {/* Add Block Buttons */}
      <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
        <span className="text-sm text-muted-foreground mr-2 flex items-center">
          <Plus className="h-4 w-4 mr-1" /> Add:
        </span>
        {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => addBlock(type)}
          >
            <Icon className="h-4 w-4 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* Block List */}
      {blocks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
          <p>No blocks yet. Add blocks above to build your email.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
              className={cn(
                "border rounded-lg p-4 bg-background transition-all",
                draggedIndex === index && "opacity-50",
                dragOverIndex === index && draggedIndex !== index && "border-primary border-2"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Block Content */}
                <div className="flex-1 space-y-3">
                  <BlockContent
                    block={block}
                    onUpdate={(updates) => updateBlock(block.id, updates)}
                    onInsertVariable={(variable) => handleInsertVariable(block.id, variable)}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveBlock(index, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveBlock(index, 'down')}
                    disabled={index === blocks.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBlock(block.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface BlockContentProps {
  block: EmailBlock;
  onUpdate: (updates: Partial<EmailBlock>) => void;
  onInsertVariable: (variable: string) => void;
}

const BlockContent = ({ block, onUpdate, onInsertVariable }: BlockContentProps) => {
  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase">Heading</Label>
            <DynamicVariableInsert onInsert={onInsertVariable} />
          </div>
          <Input
            value={block.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Enter heading text..."
            className="font-bold text-lg"
          />
        </div>
      );

    case 'text':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase">Text</Label>
            <DynamicVariableInsert onInsert={onInsertVariable} />
          </div>
          <Textarea
            value={block.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Enter text content... Use {{variables}} for personalization"
            className="min-h-[80px]"
          />
        </div>
      );

    case 'button':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Button</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={block.buttonText || ''}
              onChange={(e) => onUpdate({ buttonText: e.target.value })}
              placeholder="Button text"
            />
            <Input
              value={block.buttonUrl || ''}
              onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
              placeholder="Button URL"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Image</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={block.url || ''}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="Image URL"
            />
            <Input
              value={block.alt || ''}
              onChange={(e) => onUpdate({ alt: e.target.value })}
              placeholder="Alt text"
            />
          </div>
          {block.url && (
            <img src={block.url} alt={block.alt || ''} className="max-h-32 rounded" />
          )}
        </div>
      );

    case 'divider':
      return (
        <div className="py-2">
          <Label className="text-xs text-muted-foreground uppercase">Divider</Label>
          <hr className="mt-2 border-t-2" />
        </div>
      );

    case 'spacer':
      return (
        <div className="py-2">
          <Label className="text-xs text-muted-foreground uppercase">Spacer</Label>
          <div className="h-8 bg-muted/30 rounded mt-2 flex items-center justify-center text-xs text-muted-foreground">
            32px space
          </div>
        </div>
      );

    default:
      return null;
  }
};
