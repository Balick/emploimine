"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import Link from "next/link.js";

const items = [
  {
    id: "mumi",
    label: "Mutanda Mining",
  },
  {
    id: "glencore",
    label: "Glencore",
  },
  {
    id: "kcc",
    label: "Kamoto Copper Company",
  },
  {
    id: "mmg",
    label: "MMG",
  },
  {
    id: "kibali",
    label: "Kibali Gold Mines",
  },
] as const;

const postsVacants = [
  {
    id: "1",
    label: "1",
  },
  {
    id: "2",
    label: "2",
  },
  {
    id: "3+",
    label: "3 ou plus",
  },
] as const;

const contrat = [
  {
    id: "cdd",
    label: "Contrat à durée déterminée (CDD)",
  },
  {
    id: "cdi",
    label: "Contrat à durée indéterminée (CDI)",
  },
] as const;

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item)),
  contrat: z.array(z.string()).refine((value) => value.some((item) => item)),
  postsVacants: z
    .array(z.string())
    .refine((value) => value.some((item) => item)),
});

export default function Aside() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
      contrat: [],
      postsVacants: [],
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data);
  }

  return (
    <div className="hidden lg:block lg:sticky lg:top-2 lg:w-[30%] lg:float-right border border-[#e7e7e9] rounded-lg p-8">
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
              name="items"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="font-medium font-mona text-lg leading-[22px]">
                      Postes vacants
                    </FormLabel>
                  </div>
                  {postsVacants.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="postsVacants"
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

          <hr className="my-4 border-none h-[1px] w-full bg-[#e7e7e9]" />

          <div className="flex flex-col items-center gap-4">
            <Button type="submit" className="w-full rounded-full">
              Filtrer
            </Button>
            <Link href={"/"} className="">
              <Button type="reset" variant="link" className="rounded-full">
                Annuler les filtres
              </Button>
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
