"use client";

import FormFilter from "./FormContent";

export default function Aside() {
  return (
    <div className="hidden lg:block lg:sticky lg:top-2 lg:w-[30%] lg:float-right border border-[#e7e7e9] rounded-lg p-8">
      <FormFilter />
    </div>
  );
}
