import { useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';

export default function QRModal({ clue, baseUrl, onClose }) {
  const canvasRef = useRef(null);
  const url = `${baseUrl}/clue/${clue.id}`;

  useEffect(() => {
    // Use QRCode.js via CDN — dynamically inject it
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => {
      const container = document.getElementById('qr-container');
      if (container) {
        container.innerHTML = '';
        new window.QRCode(container, {
          text: url,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.H,
        });
      }
    };
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, [url]);

  function handleDownload() {
    const container = document.getElementById('qr-container');
    const canvas = container?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `clue-${clue.clue_number}-qr.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else {
      // fallback: open the img src
      const img = container?.querySelector('img');
      if (img) {
        const link = document.createElement('a');
        link.download = `clue-${clue.clue_number}-qr.png`;
        link.href = img.src;
        link.click();
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-2xl font-bold">QR CODE — CLUE #{clue.clue_number}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div
            id="qr-container"
            className="bg-white p-4 rounded-lg inline-block"
          />
        </div>

        <p className="text-xs text-muted-foreground mb-5 break-all">{url}</p>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:border-primary transition-colors">
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}