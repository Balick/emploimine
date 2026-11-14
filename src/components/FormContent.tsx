"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { type Filters, useSearchContext } from "@/context/search-context";
import { useId } from "react";

export type FilterOption = { value: string; label: string; count: number };

function CheckboxGroup({
  title,
  name,
  options,
}: {
  title: string;
  name: keyof Filters;
  options: FilterOption[];
}) {
  const { filters, updateFilter } = useSearchContext();
  const groupId = useId();
  const selected = filters[name];

  if (!options.length) return null;

  const toggle = (value: string, checked: boolean) =>
    updateFilter(
      name,
      checked ? [...selected, value] : selected.filter((item) => item !== value)
    );

  return (
    <fieldset className="space-y-2">
      <legend className="mb-4 font-medium font-mona text-lg leading-[22px]">
        {title}
      </legend>
      {options.map((option, index) => {
        const inputId = `${groupId}-${index}`;
        return (
          <div key={option.value} className="flex flex-row items-start gap-3">
            <Checkbox
              id={inputId}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => toggle(option.value, checked === true)}
            />
            <Label htmlFor={inputId} className="font-normal leading-4">
              {option.label}{" "}
              <span className="text-muted-foreground">({option.count})</span>
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

export default function FormFilter({
  companies,
  contracts,
}: {
  companies: FilterOption[];
  contracts: FilterOption[];
}) {
  const { filters, resetFilters } = useSearchContext();
  const hasFilters = Object.values(filters).some((values) => values.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <CheckboxGroup title="Entreprises" name="companies" options={companies} />
        {companies.length > 0 && contracts.length > 0 && (
          <hr className="my-4 border-none h-px w-full bg-[#e7e7e9]" />
        )}
        <CheckboxGroup title="Type de contrat" name="contracts" options={contracts} />
      </div>

      <Button
        type="button"
        onClick={resetFilters}
        disabled={!hasFilters}
        className="w-full rounded-full"
      >
        Annuler les filtres
      </Button>
    </div>
  );
}
