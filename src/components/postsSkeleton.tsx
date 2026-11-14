import { Skeleton } from "./ui/skeleton";

export default function PostsSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10" aria-busy="true" aria-label="Chargement des offres">
      <div>
        <Skeleton className="h-[48px] w-full rounded-xl" />
        <Skeleton className="h-6 w-48 my-[40px]" />
        <ul className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index} className="py-5 px-[10px] border border-[#f1f1f1] rounded-lg">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center w-full md:w-[75%]">
                  <Skeleton className="w-[46px] h-[46px] rounded-[4px] mr-4 flex-none" />
                  <div className="flex flex-col gap-1.5 w-full">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-5 w-[80%]" />
                    <Skeleton className="h-3 w-[160px]" />
                  </div>
                </div>
                <div className="hidden md:flex flex-col justify-between items-end gap-[20px] w-max flex-none">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Skeleton className="hidden lg:block h-[420px] rounded-lg" />
    </div>
  );
}
