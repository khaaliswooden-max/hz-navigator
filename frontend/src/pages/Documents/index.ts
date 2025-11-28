/**
 * Documents Pages
 */

export { default as Library } from './Library';

// Lazy load for code splitting
export const LazyLibrary = () => import('./Library');

