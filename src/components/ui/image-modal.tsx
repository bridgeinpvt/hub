import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalContent } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";

interface ImageModalProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ images, initialIndex, isOpen, onClose }: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsZoomed(false);
  }, [images.length]);

  const previousImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsZoomed(false);
  }, [images.length]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (event.key) {
      case 'ArrowRight':
        nextImage();
        break;
      case 'ArrowLeft':
        previousImage();
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [isOpen, nextImage, previousImage, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
        <ModalContent className="max-w-6xl max-h-[90vh] w-full h-full p-0 bg-background border border-border rounded-lg overflow-hidden sm:max-w-[95vw] sm:max-h-[95vh]">
          <div className="relative w-full h-full flex items-center justify-center bg-background">

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50 text-white bg-black/50 px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium border border-white/20">
              {currentIndex + 1} of {images.length}
            </div>
          )}

          {/* Previous button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-50 text-white hover:text-primary-foreground hover:bg-primary bg-black/20 rounded-full border border-border h-10 w-10 md:h-12 md:w-12 transition-all duration-200"
              onClick={previousImage}
            >
              <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
            </Button>
          )}

          {/* Next button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 text-white hover:text-primary-foreground hover:bg-primary bg-black/20 rounded-full border border-border h-10 w-10 md:h-12 md:w-12 transition-all duration-200"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
            </Button>
          )}

          {/* Main image */}
          <div 
            className={`relative flex items-center justify-center w-full h-full cursor-pointer transition-transform duration-300 ease-out p-4 md:p-8 ${
              isZoomed ? 'scale-125' : 'scale-100'
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
          >
            <Image
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              priority
            />
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-black/20 px-3 md:px-4 py-2 rounded-full border border-white/20">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-primary-foreground hover:bg-primary bg-transparent h-8 w-8 md:h-10 md:w-10 rounded-full transition-all duration-200"
              onClick={() => setIsZoomed(!isZoomed)}
            >
              {isZoomed ? <ZoomOut className="h-3 w-3 md:h-4 md:w-4" /> : <ZoomIn className="h-3 w-3 md:h-4 md:w-4" />}
            </Button>
          </div>

          {/* Image thumbnails for multiple images */}
          {images.length > 1 && (
            <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 z-40 hidden md:block">
              <div className="flex justify-center space-x-3 max-w-full overflow-x-auto bg-card p-3 rounded-full border border-border">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className={`relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                      index === currentIndex 
                        ? 'border-primary shadow-lg scale-110' 
                        : 'border-primary/50 opacity-70 hover:opacity-100 hover:border-primary/80'
                    }`}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsZoomed(false);
                    }}
                  >
                    <Image
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
        </ModalContent>
      </Modal>
  );
}