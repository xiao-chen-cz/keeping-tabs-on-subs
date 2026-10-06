/** What a capture was: its text, or the uploaded picture or PDF through a short-lived signed link. */
export interface CaptureFile {
  url: string;
  mimeType: string;
}

export function CaptureView({ text, file }: { text: string | null; file: CaptureFile | null }) {
  if (file && file.mimeType.startsWith("image/")) {
    return (
      // A signed Storage URL that expires: next/image would cache it under a URL that stops working.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={file.url} alt="The uploaded capture" className="mt-2 max-h-[28rem] w-auto rounded-control border border-line" />
    );
  }
  if (file) {
    return (
      <p className="mt-2">
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="link">
          Open the PDF
        </a>
      </p>
    );
  }
  if (text) return <p className="mt-2 whitespace-pre-wrap break-words">{text}</p>;
  return <p className="mt-2 text-mid">No text for this capture.</p>;
}
