import { CameraFrame } from '../../shared/ui/CameraFrame';
import { useCamera } from '../../shared/hooks/useCamera';

interface LiveScanScreenProps {
  onCapture: (dataUrl: string, canvas: HTMLCanvasElement) => void;
}

export function LiveScanScreen({ onCapture }: LiveScanScreenProps) {
  const { videoRef, ready, error, captureFrame } = useCamera(true);

  function handleCapture() {
    const frame = captureFrame();
    if (!frame) return;
    onCapture(frame.dataUrl, frame.canvas);
  }

  return (
    <section className="screen">
      <h1 className="screen-title">Live Face Scanning</h1>
      <p className="screen-sub">Hold still and keep your face inside the frame, then capture.</p>

      <CameraFrame
        videoRef={videoRef}
        error={error}
        overlay={
          <div className="pointer-events-none absolute inset-[14%] rounded-[50%/42%] border-2 border-dashed border-white/70" />
        }
      />

      <button
        type="button"
        className="btn btn-primary mt-5 w-full"
        disabled={!ready || !!error}
        onClick={handleCapture}
      >
        CAPTURE & ANALYZE
      </button>
    </section>
  );
}
