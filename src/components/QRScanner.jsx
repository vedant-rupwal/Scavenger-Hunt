import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

const READER_ID = 'qr-reader';

// Pull a "/clue/:id" path out of whatever the QR encodes (full URL or bare path).
function extractCluePath(text) {
  let path;
  try {
    path = new URL(text).pathname; // full URL e.g. https://site/clue/abc
  } catch {
    path = text.startsWith('/') ? text : `/${text}`;
  }
  const match = path.match(/\/clue\/[^/?#]+/);
  return match ? match[0] : null;
}

export default function QRScanner({ onClose }) {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    // Fully stop the camera, THEN do a real navigation to the clue. A full load
    // (rather than client-side routing) avoids the clue page mounting while the
    // camera stream is still tearing down — which left it blank until a reload.
    const goToClue = (path) => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
        .finally(() => { window.location.href = path; });
    };

    scanner
      .start(
        { facingMode: 'environment' }, // rear camera on phones
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (handledRef.current) return;
          const path = extractCluePath(decodedText);
          if (path) {
            handledRef.current = true;
            goToClue(path);
          } else {
            setError("That QR code isn't a hunt clue.");
          }
        },
        () => {} // ignore per-frame "not found" errors
      )
      .catch(() => {
        setError('Could not access the camera. Allow camera permission (and make sure the site is on HTTPS).');
      });

    return () => {
      // Stop the camera when the modal closes.
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> SCAN CLUE
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Point your camera at a clue's QR code to open it.
        </p>

        <div id={READER_ID} className="overflow-hidden rounded-lg bg-black" />

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full px-4 py-2 border border-border rounded-md text-sm hover:border-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
