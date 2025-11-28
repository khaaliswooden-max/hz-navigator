/**
 * Lazy Image Hook
 * 
 * Implements lazy loading for images with intersection observer.
 * Images only load when they enter the viewport.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface LazyImageOptions {
  src: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

export interface LazyImageResult {
  src: string;
  isLoaded: boolean;
  isError: boolean;
  ref: React.RefObject<HTMLImageElement>;
}

export function useLazyImage({
  src,
  placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  threshold = 0.1,
  rootMargin = '100px',
}: LazyImageOptions): LazyImageResult {
  const ref = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  // Intersection observer to detect when image enters viewport
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(element);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setIsError(false);
    };
    
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(false);
    };
    
    img.src = src;
  }, [isInView, src]);

  return {
    src: isInView && isLoaded ? src : placeholder,
    isLoaded,
    isError,
    ref,
  };
}

/**
 * Hook for lazy loading multiple images
 */
export function useLazyImages(
  sources: string[],
  options?: Omit<LazyImageOptions, 'src'>
) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  
  const loadImage = useCallback((src: string) => {
    if (loadedImages.has(src) || errors.has(src)) return;
    
    const img = new Image();
    
    img.onload = () => {
      setLoadedImages((prev) => new Set([...prev, src]));
    };
    
    img.onerror = () => {
      setErrors((prev) => new Set([...prev, src]));
    };
    
    img.src = src;
  }, [loadedImages, errors]);

  const getImageStatus = useCallback((src: string) => ({
    isLoaded: loadedImages.has(src),
    isError: errors.has(src),
  }), [loadedImages, errors]);

  return {
    loadImage,
    getImageStatus,
    loadedCount: loadedImages.size,
    errorCount: errors.size,
  };
}

/**
 * Progressive image loading hook
 * Loads a low-quality placeholder first, then the full image
 */
export interface ProgressiveImageOptions {
  lowQualitySrc: string;
  highQualitySrc: string;
}

export function useProgressiveImage({
  lowQualitySrc,
  highQualitySrc,
}: ProgressiveImageOptions) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading high quality image
            const img = new Image();
            img.onload = () => {
              setCurrentSrc(highQualitySrc);
              setIsHighQualityLoaded(true);
            };
            img.src = highQualitySrc;
            
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [highQualitySrc]);

  return {
    src: currentSrc,
    isHighQualityLoaded,
    ref,
    style: {
      filter: isHighQualityLoaded ? 'none' : 'blur(10px)',
      transition: 'filter 0.3s ease-out',
    },
  };
}

export default useLazyImage;

