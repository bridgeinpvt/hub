"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryCodeSelector } from "@/components/ui/country-code-selector";
import { cn } from "@/lib/utils";

interface SmartPhoneInputProps {
  value: string;
  onChange: (phone: string, countryCode: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  error?: string;
  initialCountryCode?: string;
}

export function SmartPhoneInput({
  value,
  onChange,
  placeholder = "Enter email or phone number",
  className,
  label,
  required = false,
  error,
  initialCountryCode = "91"
}: SmartPhoneInputProps) {
  const [showCountryCode, setShowCountryCode] = useState(false);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Check if input looks like a phone number
  const looksLikePhone = (input: string) => {
    const cleaned = input.replace(/\D/g, "");
    // If it starts with digits and has 7+ digits, or starts with +, consider it a phone
    return input.trim().length > 0 && (cleaned.length >= 7 || input.startsWith("+"));
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Check if we should show or hide country code
    const shouldShowCountryCode = looksLikePhone(newValue);
    
    if (shouldShowCountryCode && !showCountryCode) {
      // Switching to phone mode
      setShowCountryCode(true);
      
      // Parse existing phone number if it has country code
      const cleaned = newValue.replace(/\D/g, "");
      if (cleaned.startsWith("91") && cleaned.length >= 10) {
        setCountryCode("91");
        setPhoneNumber(cleaned.substring(2));
        onChange(cleaned.substring(2), "91");
      } else if (cleaned.startsWith("1") && cleaned.length >= 10) {
        setCountryCode("1");
        setPhoneNumber(cleaned.substring(1));
        onChange(cleaned.substring(1), "1");
      } else {
        setPhoneNumber(cleaned);
        onChange(cleaned, countryCode);
      }
      
      // Focus the phone input after state updates
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 0);
    } else if (!shouldShowCountryCode && showCountryCode) {
      // Switching to regular mode (cleared or email)
      setShowCountryCode(false);
      setPhoneNumber("");
      onChange(newValue, "");
      
      // Focus the regular input after state updates
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else if (showCountryCode) {
      // Already in phone mode, just update phone number
      const cleanPhone = newValue.replace(/\D/g, "");
      setPhoneNumber(cleanPhone);
      onChange(cleanPhone, countryCode);
    } else {
      // Regular mode, pass full value
      onChange(newValue, "");
    }
  };

  // Handle country code changes
  const handleCountryCodeChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    onChange(phoneNumber, newCountryCode);
  };

  // Handle phone number changes when country code is shown
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cleanPhone = newValue.replace(/\D/g, "");
    setPhoneNumber(cleanPhone);
    setInputValue(cleanPhone);
    
    // Check if phone number is cleared or too short
    if (!looksLikePhone(cleanPhone)) {
      setShowCountryCode(false);
      setPhoneNumber("");
      onChange(cleanPhone, "");
      
      // Focus the regular input after clearing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      onChange(cleanPhone, countryCode);
    }
  };

  // Update country code when initialCountryCode changes
  useEffect(() => {
    if (initialCountryCode !== countryCode) {
      setCountryCode(initialCountryCode);
    }
  }, [initialCountryCode]);

  // Update input value when external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
      if (looksLikePhone(value) && value.trim().length > 0) {
        setShowCountryCode(true);
        setPhoneNumber(value.replace(/\D/g, ""));
      } else {
        setShowCountryCode(false);
        setPhoneNumber("");
      }
    }
  }, [value, inputValue]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {showCountryCode ? (
        // Phone input with country code selector
        <div className="flex gap-2">
          <div className="w-[140px]">
            <CountryCodeSelector
              value={countryCode}
              onChange={handleCountryCodeChange}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <Input
              ref={phoneInputRef}
              type="tel"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              className={cn(
                "bg-background",
                error && "border-red-500 focus:border-red-500"
              )}
              required={required}
            />
          </div>
        </div>
      ) : (
        // Regular input for email or mixed input
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          className={cn(
            "bg-background",
            error && "border-red-500 focus:border-red-500"
          )}
          required={required}
        />
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
    </div>
  );
}