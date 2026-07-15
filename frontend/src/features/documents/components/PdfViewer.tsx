interface PdfViewerProps {
  url: string;
  title?: string;
}

export function PdfViewer({ url, title }: PdfViewerProps) {
  return (
    <iframe
      src={url}
      title={title || 'Visualização de PDF'}
      aria-describedby="pdf-instructions"
      className="h-[60vh] w-full"
      loading="lazy"
    />
  );
}
