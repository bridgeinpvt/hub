"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_CODES, getPopularCountries, getAllCountries, type CountryCode } from "@/lib/country-codes";

interface CountryCodeSelectorProps {
  value?: string;
  onChange: (countryCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountryCodeSelector({
  value = "1",
  onChange,
  placeholder,
  disabled = false,
  className
}: CountryCodeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const selectedCountry = COUNTRY_CODES.find(country => country.code === value);
  const popularCountries = getPopularCountries();
  const allCountries = getAllCountries();
  
  // Filter countries based on search
  const filteredCountries = searchValue
    ? allCountries.filter(country => 
        country.country.toLowerCase().includes(searchValue.toLowerCase()) ||
        country.code.includes(searchValue) ||
        country.iso.toLowerCase().includes(searchValue.toLowerCase())
      )
    : allCountries;

  const handleSelect = (countryCode: string) => {
    onChange(countryCode);
    setOpen(false);
    setSearchValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedCountry && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {selectedCountry ? (
              <>
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="font-mono">+{selectedCountry.code}</span>
                <span className="hidden sm:inline text-sm text-muted-foreground">
                  {selectedCountry.country}
                </span>
              </>
            ) : (
              <span>{placeholder || "Select country"}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search countries..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-auto">
            <CommandEmpty>No country found.</CommandEmpty>
            
            {/* Popular Countries */}
            {!searchValue && (
              <CommandGroup heading="Popular">
                {popularCountries.map((country) => (
                  <CommandItem
                    key={`popular-${country.code}-${country.iso}`}
                    value={`${country.country} ${country.code} ${country.iso}`}
                    onSelect={() => handleSelect(country.code)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{country.flag}</span>
                      <div>
                        <div className="font-medium">{country.country}</div>
                        <div className="text-sm text-muted-foreground">+{country.code}</div>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedCountry?.code === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {/* All Countries */}
            <CommandGroup heading={!searchValue ? "All Countries" : ""}>
              {filteredCountries.map((country) => (
                <CommandItem
                  key={`all-${country.code}-${country.iso}`}
                  value={`${country.country} ${country.code} ${country.iso}`}
                  onSelect={() => handleSelect(country.code)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{country.flag}</span>
                    <div>
                      <div className="font-medium">{country.country}</div>
                      <div className="text-sm text-muted-foreground">+{country.code}</div>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedCountry?.code === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface PhoneInputWithCountryProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (phone: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PhoneInputWithCountry({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  disabled = false,
  placeholder = "Enter phone number",
  className
}: PhoneInputWithCountryProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <div className="w-[140px]">
        <CountryCodeSelector
          value={countryCode}
          onChange={onCountryCodeChange}
          disabled={disabled}
          className="w-full"
        />
      </div>
      <div className="flex-1">
        <Input
          type="tel"
          placeholder={placeholder}
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}