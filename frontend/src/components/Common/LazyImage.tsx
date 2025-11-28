/**
 * Lazy Image Component
 * 
 * Lazy loads images when they enter the viewport.
 * Includes placeholder, error state, and progressive loading.
 */

import React, { memo, useState, useEffect, useRef, type CSSProperties, type ImgHTMLAttributes } from 'react';

// ===== Types =====

export interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  aspectRatio?: string;
  objectFit?: CSSProperties['objectFit'];
  threshold?: number;
  rootMargin?: string;
  blur?: boolean;
  fadeIn?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

// ===== Default Placeholder =====

const DEFAULT_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3C/svg%3E';
const DEFAULT_ERROR_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="10"%3EFailed to load%3C/text%3E%3C/svg%3E';

// ===== Component =====

export const LazyImage = memo<LazyImageProps>(function LazyImage({
  src,
  alt,
  placeholder = DEFAULT_PLACEHOLDER,
  fallback = DEFAULT_ERROR_IMAGE,
  aspectRatio,
  objectFit = 'cover',
  threshold = 0.1,
  rootMargin = '100px',
  blur = true,
  fadeIn = true,
  onLoad,
  onError,
  className = '',
  style,
  ...props
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  // Intersection observer
  useEffect(() => {
    const element = imgRef.current;
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

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
      setHasError(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      setCurrentSrc(fallback);
      setHasError(true);
      onError?.();
    };
    
    img.src = src;
  }, [isInView, src, fallback, onLoad, onError]);

  // Combined styles
  const combinedStyle: CSSProperties = {
    objectFit,
    aspectRatio,
    transition: fadeIn ? 'opacity 0.3s ease-out, filter 0.3s ease-out' : undefined,
    opacity: fadeIn && !isLoaded ? 0.6 : 1,
    filter: blur && !isLoaded ? 'blur(10px)' : 'none',
    ...style,
  };

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={`lazy-image ${className}`}
      style={combinedStyle}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
});

// ===== Progressive Image =====

interface ProgressiveImageProps extends Omit<LazyImageProps, 'placeholder'> {
  lowQualitySrc: string;
}

export const ProgressiveImage = memo<ProgressiveImageProps>(function ProgressiveImage({
  src,
  lowQualitySrc,
  alt,
  className = '',
  style,
  onLoad,
  ...props
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

  // Intersection observer
  useEffect(() => {
    const element = containerRef.current;
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
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Load high quality when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setIsHighQualityLoaded(true);
      onLoad?.();
    };
    img.src = src;
  }, [isInView, src, onLoad]);

  const imageStyle: CSSProperties = {
    filter: isHighQualityLoaded ? 'none' : 'blur(20px)',
    transition: 'filter 0.5s ease-out',
    transform: 'scale(1.1)', // Prevent blur edge artifacts
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={`progressive-image overflow-hidden ${className}`}
      style={{ position: 'relative' }}
    >
      <img
        src={currentSrc}
        alt={alt}
        style={imageStyle}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </div>
  );
});

// ===== Background Image =====

interface LazyBackgroundProps {
  src: string;
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const LazyBackground = memo<LazyBackgroundProps>(function LazyBackground({
  src,
  placeholder = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
  children,
  className = '',
  style,
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [background, setBackground] = useState(placeholder);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.onload = () => {
              setBackground(`url(${src})`);
              setIsLoaded(true);
            };
            img.src = src;
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [src]);

  const combinedStyle: CSSProperties = {
    backgroundImage: background,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'background-image 0.3s ease-out',
    opacity: isLoaded ? 1 : 0.8,
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={`lazy-background ${className}`}
      style={combinedStyle}
    >
      {children}
    </div>
  );
});

export default LazyImage;

