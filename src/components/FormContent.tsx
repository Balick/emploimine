"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { contrat, items } from "@/constants";
import { type Filters, useSearchContext } from "@/context/search-context";
import { useId } from "react";

type Option = { id: string; label: string };

function CheckboxGroup({
  title,
  name,
  options,
}: {
  title: string;
  name: keyof Filters;
  options: Option[];
}) {
  const { filters, updateFilter } = useSearchContext();
  const groupId = useId();
  const selected = filters[name];

  const toggle = (id: string, checked: boolean) =>
    updateFilter(
      name,
      checked ? [...selected, id] : selected.filter((value) => value !== id)
    );

  return (
    <fieldset className="space-y-2">
      <legend className="mb-4 font-medium font-mona text-lg leading-[22px]">
        {title}
      </legend>
      {options.map((option) => {
        const inputId = `${groupId}-${option.id}`;
        return (
          <div key={option.id} className="flex flex-row items-start gap-3">
            <Checkbox
              id={inputId}
              checked={selected.includes(option.id)}
              onCheckedChange={(checked) => toggle(option.id, checked === true)}
            />
            <Label htmlFor={inputId} className="font-normal">
              {option.label}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

export default function FormFilter() {
  const { filters, resetFilters } = useSearchContext();
  const hasFilters = Object.values(filters).some((values) => values.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <CheckboxGroup title="Entreprises" name="companies" options={items} />
        <hr className="my-4 border-none h-px w-full bg-[#e7e7e9]" />
        <CheckboxGroup title="Type de contrat" name="contrat" options={contrat} />
      </div>

      <hr className="my-4 border-none h-px w-full bg-[#e7e7e9] hidden lg:block" />

      <div className="flex-col items-center gap-4 hidden lg:flex">
        <Button
          type="button"
          onClick={resetFilters}
          disabled={!hasFilters}
          className="w-full rounded-full"
        >
          Annuler les filtres
        </Button>
      </div>
    </div>
  );
}
