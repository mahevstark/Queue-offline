'use client'
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

 function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: " space-y-4 flex flex-col-reverse items-center sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-green-800",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
          "text-green-800 hover:bg-green-100 rounded-md"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-green-600 rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-green-50",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day: cn(
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-green-100 rounded-md transition-colors",
          "text-green-800"
        ),
        day_selected:
          "bg-green-600 text-white hover:bg-green-600 hover:text-white focus:bg-green-600 focus:text-white",
        day_today: "bg-green-100 text-green-900",
        day_outside: "text-green-400 opacity-50",
        day_disabled: "text-green-400 opacity-50",
        day_range_middle:
          "aria-selected:bg-green-50 aria-selected:text-green-900",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

export default Calendar;