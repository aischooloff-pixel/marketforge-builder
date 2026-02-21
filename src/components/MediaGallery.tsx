import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaGalleryProps {
  urls: string[];
  alt?: string;
  fallbackIcon?: string;
}

const isVideo = (url: string) => /\.(mp4|webm|mov|avi)$/i.test(url);

export const MediaGallery = ({ urls, alt = '', fallbackIcon = '📦' }: MediaGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const hasMedia = urls.length > 0;
  const activeUrl = urls[activeIndex];

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback((i: number) => {
    setActiveIndex(i);
    resetView();
  }, [resetView]);

  const prev = () => goTo((activeIndex - 1 + urls.length) % urls.length);
  const next = () => goTo((activeIndex + 1) % urls.length);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(1, z - e.deltaY * 0.002)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: panStart.current.x + e.clientX - dragStart.current.x,
      y: panStart.current.y + e.clientY - dragStart.current.y,
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  useEffect(() => { resetView(); }, [activeIndex, lightboxOpen, resetView]);

  // Keyboard nav in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, activeIndex]);

  if (!hasMedia) {
    return (
      <div className="bevel-sunken bg-background p-1">
        <div className="relative aspect-[2/1] md:aspect-[16/9] overflow-hidden flex items-center justify-center bg-secondary/50">
          <span className="text-5xl md:text-6xl">{fallbackIcon}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main preview */}
      <div className="bevel-sunken bg-background p-1">
        <div
          className="relative aspect-[2/1] md:aspect-[16/9] overflow-hidden cursor-pointer group"
          onClick={() => { if (!isVideo(activeUrl)) setLightboxOpen(true); }}
        >
          {isVideo(activeUrl) ? (
            <video src={activeUrl} className="w-full h-full object-cover" controls muted />
          ) : (
            <img src={activeUrl} alt={alt} className="w-full h-full object-cover" />
          )}
          {!isVideo(activeUrl) && (
            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="h-8 w-8 text-foreground drop-shadow" />
            </div>
          )}
          {/* Nav arrows */}
          {urls.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded bg-background/70 hover:bg-background/90 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-background/70 hover:bg-background/90 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="flex gap-1 overflow-x-auto py-1">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'w-12 h-12 bevel-sunken bg-background p-0.5 flex-shrink-0 transition-all',
                i === activeIndex && 'ring-2 ring-primary'
              )}
            >
              {isVideo(url) ? (
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                  <Film className="h-4 w-4 text-muted-foreground" />
                </div>
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 border-none overflow-hidden [&>button]:hidden">
          <div className="relative w-full h-[90vh] flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border">
              <span className="text-xs text-muted-foreground">
                {activeIndex + 1} / {urls.length}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(1, z - 0.5))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs flex items-center px-2 min-w-[3rem] justify-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(5, z + 0.5))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-2" onClick={() => setLightboxOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image */}
            <div
              className="flex-1 overflow-hidden flex items-center justify-center select-none"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
            >
              <img
                src={activeUrl}
                alt={alt}
                className="max-w-full max-h-full object-contain transition-transform duration-100"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
                draggable={false}
              />
            </div>

            {/* Nav arrows */}
            {urls.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
