
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
  preset: string;
}

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const DateRangeSelector = ({ dateRange, onDateRangeChange }: DateRangeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: '24h', value: '24h' },
    { label: '7 days', value: '7d' },
    { label: '30 days', value: '30d' },
    { label: 'All', value: 'all' }
  ];

  const handlePresetClick = (preset: string) => {
    const now = new Date();
    let from: Date;
    let to = now;

    switch (preset) {
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        from = new Date('2020-01-01');
        break;
      default:
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    onDateRangeChange({ from, to, preset });
  };

  const handleCustomDateChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const range = dateRange.from > selectedDate 
        ? { from: selectedDate, to: dateRange.from }
        : { from: dateRange.from, to: selectedDate };
      
      onDateRangeChange({ ...range, preset: 'custom' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            variant={dateRange.preset === preset.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={dateRange.preset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Custom range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={{ from: dateRange?.from, to: dateRange?.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to, preset: 'custom' });
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
