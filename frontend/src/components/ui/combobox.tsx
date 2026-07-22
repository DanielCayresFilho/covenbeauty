import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ComboItem {
  value: string;
  label: string;
  hint?: string;
}

/** Select com busca (Popover + Command). Filtra pelo texto do rótulo. */
export function Combobox({
  items,
  value,
  onChange,
  placeholder = "Selecionar",
  searchPlaceholder = "Buscar...",
  className,
}: {
  items: ComboItem[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {items.map((i) => (
              <CommandItem
                key={i.value}
                value={`${i.label} ${i.value}`}
                onSelect={() => {
                  onChange(i.value);
                  setOpen(false);
                }}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {i.label}
                    {i.hint && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {i.hint}
                      </span>
                    )}
                  </span>
                  {value === i.value && (
                    <Check className="h-4 w-4 shrink-0 text-blood" />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
