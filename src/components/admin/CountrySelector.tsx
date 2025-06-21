
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { COUNTRIES, Country } from '@/data/countries';

interface CountrySelectorProps {
  selectedCountries: Country[];
  onCountriesChange: (countries: Country[]) => void;
}

export const CountrySelector = ({ selectedCountries = [], onCountriesChange }: CountrySelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Ensure COUNTRIES is always an array and filter safely
  const availableCountries = Array.isArray(COUNTRIES) ? COUNTRIES : [];
  const selectedCodes = new Set((selectedCountries || []).map(c => c.code));
  
  const filteredCountries = availableCountries.filter(country => {
    if (!country || !country.name || !country.code) return false;
    
    const matchesSearch = searchTerm === '' || 
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const notSelected = !selectedCodes.has(country.code);
    
    return matchesSearch && notSelected;
  });

  const handleAddCountry = (countryCode: string) => {
    const country = availableCountries.find(c => c?.code === countryCode);
    if (country && !selectedCodes.has(countryCode)) {
      const newCountries = [...(selectedCountries || []), country];
      onCountriesChange(newCountries);
      setSearchTerm('');
      setIsSelectOpen(false);
    }
  };

  const handleRemoveCountry = (countryCode: string) => {
    const newCountries = (selectedCountries || []).filter(c => c?.code !== countryCode);
    onCountriesChange(newCountries);
  };

  const handleClearAll = () => {
    onCountriesChange([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Selected Countries</CardTitle>
            <CardDescription className="text-xs">
              Countries where this plan will be available
            </CardDescription>
          </div>
          {(selectedCountries || []).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Countries Display */}
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {(selectedCountries || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No countries selected</p>
          ) : (
            (selectedCountries || []).map((country) => {
              if (!country || !country.code) return null;
              return (
                <Badge
                  key={country.code}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveCountry(country.code)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })
          )}
        </div>

        {/* Add Country Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Country Selection using Select component */}
          <Select 
            value=""
            onValueChange={handleAddCountry}
            open={isSelectOpen}
            onOpenChange={setIsSelectOpen}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a country to add" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredCountries.length === 0 ? (
                <div className="px-2 py-1 text-sm text-muted-foreground">
                  {searchTerm ? 'No countries match your search' : 'All countries selected'}
                </div>
              ) : (
                filteredCountries.slice(0, 20).map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                      <span className="text-xs text-muted-foreground">({country.code})</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {filteredCountries.length > 20 && (
            <p className="text-xs text-muted-foreground">
              Showing first 20 results. Use search to find specific countries.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const commonCountries = availableCountries.filter(c => 
                ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP'].includes(c?.code || '')
              );
              const newCountries = [
                ...(selectedCountries || []),
                ...commonCountries.filter(c => c && !selectedCodes.has(c.code))
              ];
              onCountriesChange(newCountries);
            }}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Popular
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allUnselected = availableCountries.filter(c => 
                c && c.code && !selectedCodes.has(c.code)
              );
              onCountriesChange([...(selectedCountries || []), ...allUnselected]);
            }}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
