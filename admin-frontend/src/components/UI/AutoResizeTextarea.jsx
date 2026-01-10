import React, { useRef, useEffect } from 'react';
import { cn } from '../../utils/helpers';

export const AutoResizeTextarea = ({
  value,
  onChange,
  placeholder,
  className,
  minHeight = '200px',
  ...props
}) => {
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Get the parent container - walk up the DOM tree
    let currentElement = textarea.parentElement;
    let editorContainer = null;
    let cardContainer = null;
    
    // Find the editor container (the one with padding and flex-1)
    while (currentElement) {
      const classes = currentElement.className || '';
      // Check if this is the editor/content container (has padding and flex-1)
      if ((classes.includes('p-3') || classes.includes('p-4')) && 
          classes.includes('flex-1') && 
          classes.includes('flex-col')) {
        editorContainer = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (!editorContainer) return;
    
    // Now find the card container (parent with flex-1 flex flex-col)
    currentElement = editorContainer.parentElement;
    while (currentElement) {
      const classes = currentElement.className || '';
      if (classes.includes('flex-1') && 
          classes.includes('flex-col') && 
          classes.includes('min-h-0') &&
          (classes.includes('bg-white') || classes.includes('rounded-xl'))) {
        cardContainer = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (!cardContainer) return;

    // Get the dimensions
    const cardRect = cardContainer.getBoundingClientRect();
    const cardHeight = cardRect.height;
    
    // Get padding from editor container
    const editorStyle = window.getComputedStyle(editorContainer);
    const editorPaddingTop = parseInt(editorStyle.paddingTop) || 0;
    const editorPaddingBottom = parseInt(editorStyle.paddingBottom) || 0;
    
    // Find header - look for element with border-b inside the card
    const header = cardContainer.querySelector('[class*="border-b"][class*="bg-neutral-50"]');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    
    // Find footer - look for element with border-t inside the card
    const footer = cardContainer.querySelector('[class*="border-t"][class*="bg-neutral-50"]');
    const footerHeight = footer ? footer.getBoundingClientRect().height : 0;
    
    // Calculate available height
    const availableHeight = cardHeight - headerHeight - footerHeight - editorPaddingTop - editorPaddingBottom;
    
    // Reset height to get scrollHeight
    textarea.style.height = 'auto';
    
    // Get content height
    const contentHeight = textarea.scrollHeight;
    
    // Calculate final height
    const newHeight = Math.min(contentHeight, availableHeight);
    const finalHeight = Math.max(parseInt(minHeight), newHeight);
    
    // Apply height
    textarea.style.height = `${finalHeight}px`;
    
    // Set overflow
    if (contentHeight > availableHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  useEffect(() => {
    // Initial adjustment with delay for DOM readiness
    const timer = setTimeout(adjustHeight, 100);
    
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', adjustHeight);
    };
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e);
        requestAnimationFrame(adjustHeight);
      }}
      placeholder={placeholder}
      className={cn(
        "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm transition-colors",
        "bg-white text-neutral-900 placeholder-neutral-400 border-neutral-200",
        className
      )}
      style={{ 
        minHeight: minHeight,
      }}
      {...props}
    />
  );
};
