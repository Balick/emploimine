import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ListFilter } from "lucide-react";
import FormFilter, { type FilterOption } from "./FormContent";

export default function FilterButton(props: {
  companies: FilterOption[];
  contracts: FilterOption[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="border-[1.5px] border-[#e7e7e9] rounded-full leading-4 flex items-center justify-center gap-1 lg:hidden"
        >
          <ListFilter className="w-4 h-4" />
          Filtrer
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-4 overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Filtrer</SheetTitle>
          <SheetDescription className="sr-only">
            Filtrer les offres par entreprise et type de contrat
          </SheetDescription>
        </SheetHeader>
        <FormFilter {...props} />
      </SheetContent>
    </Sheet>
  );
}
