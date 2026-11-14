import FormFilter, { type FilterOption } from "./FormContent";

export default function Aside(props: {
  companies: FilterOption[];
  contracts: FilterOption[];
}) {
  return (
    <aside className="hidden lg:block lg:sticky lg:top-4 self-start border border-[#e7e7e9] rounded-lg p-8 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <FormFilter {...props} />
    </aside>
  );
}
