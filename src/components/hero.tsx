export default function Hero() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <h1 className="font-sourceRegular lg:text-[72px] text-3xl md:text-5xl text-center mx-auto max-w-[732px] md:leading-[55px] lg:leading-[65px]">
        Les offres d&apos;emploi du secteur minier en RDC, au même endroit.
      </h1>
      <p className="font-mona text-center mt-[16px] max-w-[732px] mx-auto text-xl leading-[28px] text-[#3d3d4e]">
        Nous récupérons chaque jour les offres publiées par les entreprises minières, leurs
        sous-traitants et les cabinets de recrutement, pour que vous n&apos;ayez plus à visiter
        des dizaines de sites.
      </p>
    </div>
  );
}
