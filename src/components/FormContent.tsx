"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { contrat, items } from "@/constants";
import { useSearchContext } from "@/context/search-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item)),
  contrat: z.array(z.string()).refine((value) => value.some((item) => item)),
  postsVacants: z
    .array(z.string())
    .refine((value) => value.some((item) => item)),
});

export default function FormFilter() {
  const { updateFilter } = useSearchContext();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
      contrat: [],
      postsVacants: [],
    },
  });

  const companiesFilter = form.watch("items");
  const postsFilter = form.watch("postsVacants");
  const contratFilter = form.watch("contrat");

  useEffect(() => {
    updateFilter("companies", companiesFilter);
  }, [companiesFilter]);

  useEffect(() => {
    updateFilter("postsVacants", postsFilter);
  }, [postsFilter]);

  useEffect(() => {
    updateFilter("contrat", contratFilter);
  }, [contratFilter]);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div>
          <FormField
            control={form.control}
            name="items"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="font-medium font-mona text-lg leading-[22px]">
                    Entréprises
                  </FormLabel>
                </div>
                {items.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="items"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, item.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== item.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
                <FormMessage />
              </FormItem>
            )}
          />

          <hr className="my-4 border-none h-[1px] w-full bg-[#e7e7e9]" />

          <FormField
            control={form.control}
            name="contrat"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="font-medium font-mona text-lg leading-[22px]">
                    Type de contrat
                  </FormLabel>
                </div>
                {contrat.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="contrat"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, item.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== item.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <hr className="my-4 border-none h-[1px] w-full bg-[#e7e7e9] hidden lg:block" />

        <div className="flex-col items-center gap-4 hidden lg:flex">
          <Button type="reset" className="w-full rounded-full">
            Annuler les filtres
          </Button>
        </div>
      </form>
    </Form>
  );
}
