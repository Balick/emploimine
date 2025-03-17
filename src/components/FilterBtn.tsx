import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ListFilter } from "lucide-react";
import FormFilter from "./FormContent";

export default function FilterButton() {
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
      <SheetContent className="flex flex-col items-center justify-center gap-4">
        <SheetHeader className="mb-4">
          <SheetTitle>Filtrer</SheetTitle>
        </SheetHeader>
        <FormFilter />
      </SheetContent>
    </Sheet>
  );
}
