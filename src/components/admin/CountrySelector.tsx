
import React, { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRIES, Country } from '@/data/countries';

interface CountrySelectorProps {
  selectedCountries: Country[];
  onCountriesChange: (countries: Country[]) => void;
  placeholder?: string;
}

export const CountrySelector = ({ 
  selectedCountries, 
  onCountriesChange, 
  placeholder = "Select countries..." 
}: CountrySelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleCountryToggle = (country: Country) => {
    const isSelected = selectedCountries.some(c => c.code === country.code);
    
    if (isSelected) {
      onCountriesChange(selectedCountries.filter(c => c.code !== country.code));
    } else {
      onCountriesChange([...selectedCountries, country]);
    }
  };

  const removeCountry = (countryCode: string) => {
    onCountriesChange(selectedCountries.filter(c => c.code !== countryCode));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCountries.length === 0 
              ? placeholder 
              : `${selectedCountries.length} countries selected`
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandEmpty>No countries found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {COUNTRIES.map((country) => {
                const isSelected = selectedCountries.some(c => c.code === country.code);
                return (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.code}`}
                    onSelect={() => handleCountryToggle(country)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2">{country.flag}</span>
                    <span>{country.name}</span>
                    <span className="ml-auto text-xs text-gray-500">{country.code}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Selected Countries Display */}
      {selectedCountries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCountries.map((country) => (
            <Badge key={country.code} variant="secondary" className="flex items-center gap-1">
              <span>{country.flag}</span>
              <span>{country.name}</span>
              <button
                onClick={() => removeCountry(country.code)}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
