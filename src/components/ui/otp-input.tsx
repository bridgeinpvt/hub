"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useKeyboard } from "@/contexts/KeyboardContext";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function OTPInput({ 
  length = 6, 
  value, 
  onChange, 
  disabled = false,
  className 
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(new Array(length).fill(null));
  const { isKeyboardOpen } = useKeyboard();

  // Update local state when value prop changes
  useEffect(() => {
    const newOtp = value.split("");
    const paddedOtp = [...newOtp, ...new Array(length - newOtp.length).fill("")];
    setOtp(paddedOtp.slice(0, length));
  }, [value, length]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const val = element.value;
    
    if (isNaN(Number(val))) return;

    const newOtp = [...otp];
    
    if (val.length > 1) {
      // Handle paste or multiple characters
      const pastedData = val.slice(0, length - index);
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < length) {
          newOtp[index + i] = pastedData[i];
        }
      }
      setOtp(newOtp);
      onChange(newOtp.join(""));
      
      // Focus the next empty input or the last input
      const nextIndex = Math.min(index + pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // Handle single character
      newOtp[index] = val;
      setOtp(newOtp);
      onChange(newOtp.join(""));

      // Focus next input if current field is filled
      if (val && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const element = e.target as HTMLInputElement;
    
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (element.value === "" && index > 0) {
        // If current input is empty, move to previous and clear it
        newOtp[index - 1] = "";
        setOtp(newOtp);
        onChange(newOtp.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        newOtp[index] = "";
        setOtp(newOtp);
        onChange(newOtp.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when input is focused
    inputRefs.current[index]?.select();
  };

  return (
    <div className={cn(
      "flex gap-4 justify-center otp-container",
      isKeyboardOpen && "keyboard-active",
      className
    )}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="number"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\\d{1}"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={cn(
            "flex h-14 w-12 text-center text-base font-normal leading-normal",
            "rounded-lg border-2 border-input-border",
            "bg-input focus:bg-background text-foreground",
            "focus:outline-0 focus:ring-0 focus:border-primary",
            "keyboard-adjust",
            "[appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}