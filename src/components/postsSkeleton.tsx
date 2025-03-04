import { Skeleton } from "./ui/skeleton";

export default function PostsSkeleton() {
  return (
    <ul className="flex flex-col gap-4 min-h-[646px]">
      {Array.from({ length: 5 }).map((_, index) => (
        <li
          key={index}
          className="py-5 px-[10px] border border-[#f1f1f1] rounded-lg"
        >
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center w-[100%] md:w-[75%]">
              <Skeleton className="w-[46px] h-[46px] rounded-[4px] mr-4 flex-none" />
              <div className="flex flex-col gap-1.5 w-full">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-5 w-[80%]" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-[40px]" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-[120px] hidden md:block" />
                  <Skeleton className="h-3 w-[80px] md:hidden" />
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col justify-between items-end gap-[20px] w-max flex-none">
              <Skeleton className="h-4 w-[100px]" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
