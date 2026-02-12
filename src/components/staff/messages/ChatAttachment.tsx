import { Download, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatAttachmentProps {
  url: string;
  name: string;
  type: string;
  isOwnMessage: boolean;
}

const isImageType = (type: string) => type.startsWith('image/');

export const ChatAttachment = ({ url, name, type, isOwnMessage }: ChatAttachmentProps) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  if (isImageType(type)) {
    return (
      <div className="relative group rounded-lg overflow-hidden max-w-[250px]">
        <img src={url} alt={name} className="rounded-lg max-w-full h-auto" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer ${
        isOwnMessage ? 'bg-primary-foreground/20' : 'bg-muted'
      }`}
      onClick={handleDownload}
    >
      <FileText className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm truncate flex-1">{name}</span>
      <Download className="h-4 w-4 flex-shrink-0 opacity-60" />
    </div>
  );
};
