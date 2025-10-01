"use client";

import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

// Popular Indian states and UTs
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh", 
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// Popular countries
const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom", 
  "Canada",
  "Australia",
  "Singapore",
  "UAE",
  "Germany",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Switzerland",
];

// Popular Indian cities
const INDIAN_CITIES = [
  "Mumbai, Maharashtra",
  "Delhi, Delhi",
  "Bangalore, Karnataka",
  "Hyderabad, Telangana",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Pune, Maharashtra",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "Surat, Gujarat",
  "Lucknow, Uttar Pradesh",
  "Kanpur, Uttar Pradesh",
  "Nagpur, Maharashtra",
  "Patna, Bihar",
  "Indore, Madhya Pradesh",
  "Thane, Maharashtra",
  "Bhopal, Madhya Pradesh",
  "Visakhapatnam, Andhra Pradesh",
  "Vadodara, Gujarat",
  "Firozabad, Uttar Pradesh",
];

export function LocationSelector({ 
  value, 
  onChange, 
  placeholder = "Select your location",
  className = "",
  label,
  required = false
}: LocationSelectorProps) {
  const [locationType, setLocationType] = useState<"preset" | "manual">(
    value && !INDIAN_CITIES.includes(value) && !INDIAN_STATES.includes(value) && !COUNTRIES.includes(value) 
      ? "manual" 
      : "preset"
  );
  const [manualLocation, setManualLocation] = useState(
    locationType === "manual" ? value : ""
  );

  const handleLocationTypeChange = (type: "preset" | "manual") => {
    setLocationType(type);
    if (type === "preset") {
      setManualLocation("");
      onChange("");
    } else {
      onChange(manualLocation);
    }
  };

  const handlePresetSelection = (selectedValue: string) => {
    onChange(selectedValue);
  };

  const handleManualInputChange = (inputValue: string) => {
    setManualLocation(inputValue);
    onChange(inputValue);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {/* Location Type Selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleLocationTypeChange("preset")}
          className={`px-3 py-1 text-xs rounded-md border transition-colors ${
            locationType === "preset"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          Select from list
        </button>
        <button
          type="button"
          onClick={() => handleLocationTypeChange("manual")}
          className={`px-3 py-1 text-xs rounded-md border transition-colors ${
            locationType === "manual"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          Enter manually
        </button>
      </div>

      {/* Location Input */}
      {locationType === "preset" ? (
        <Select value={value} onValueChange={handlePresetSelection}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {/* Popular Indian Cities */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Popular Cities
            </div>
            {INDIAN_CITIES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
            
            {/* Indian States */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
              Indian States
            </div>
            {INDIAN_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
            
            {/* Countries */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
              Countries
            </div>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type="text"
          value={manualLocation}
          onChange={(e) => handleManualInputChange(e.target.value)}
          placeholder="Enter your location manually. City, state or country"
          className="bg-background"
          required={required}
        />
      )}
      
      {locationType === "preset" && (
        <p className="text-xs text-muted-foreground">
          Can't find your location? Switch to manual entry above.
        </p>
      )}
    </div>
  );
}