"use client";

import { useKeyboardAdjustments } from '@/hooks/useKeyboardAdjustments';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface KeyboardAwareContainerProps {
  children: ReactNode;
  className?: string;
  type?: 'form' | 'modal' | 'page' | 'scroll' | 'auth';
}

export function KeyboardAwareContainer({ 
  children, 
  className, 
  type = 'page' 
}: KeyboardAwareContainerProps) {
  const { keyboardClasses, isKeyboardOpen } = useKeyboardAdjustments();

  const getTypeClasses = () => {
    switch (type) {
      case 'form':
        return keyboardClasses.form;
      case 'modal':
        return keyboardClasses.modal;
      case 'scroll':
        return keyboardClasses.scroll;
      case 'auth':
        return 'auth-container keyboard-responsive';
      default:
        return 'keyboard-responsive';
    }
  };

  return (
    <div 
      className={cn(
        getTypeClasses(),
        isKeyboardOpen && 'keyboard-active',
        className
      )}
    >
      {children}
    </div>
  );
}