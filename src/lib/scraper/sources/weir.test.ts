import { describe, expect, it } from "vitest";
import { runSource } from "../run";
import { fixtureContext } from "../testing";
import source from "./weir";

const API = "weir.wd3.myworkdayjobs.com/wday/cxs/weir/Weir_External_Careers";

const searchOffset = (options: { json?: unknown } | undefined) =>
  (options?.json as { offset?: number } | undefined)?.offset;

describe("weir", () => {
  it("keeps only DRC offers and normalises them", async () => {
    // Weir had no DRC offer on 2026-11-14. The Solwezi (Zambia) posting and
    // its detail are real; the Kolwezi "Service Technician" posting and its
    // detail (job-R0039999.json) are hand-edited copies of them, so that the
    // parsing of a DRC offer is tested.
    const ctx = fixtureContext([
      {
        match: `${API}/jobs`,
        when: (options) =>
          JSON.stringify(options?.json).includes('"Country":["db69c26c446c11de98360015c5e6daf6"]'),
        file: "weir/jobs.json",
      },
      { match: `${API}/job/Solwezi/`, file: "weir/job-R0038483.json" },
      { match: `${API}/job/Kolwezi/`, file: "weir/job-R0039999.json" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.jobs.map((job) => job.title)).toEqual(["Service Technician"]);
    expect(result.jobs[0]).toMatchObject({
      externalId: "R0039999",
      company: "Weir Minerals",
      url: "https://weir.wd3.myworkdayjobs.com/Weir_External_Careers/job/Kolwezi/Service-Technician_R0039999",
      location: "Kolwezi",
      city: "Kolwezi",
      publishedAt: "2026-11-02",
      closesAt: "2026-12-15",
    });
    expect(result.jobs[0].descriptionHtml).toContain("<b>Job Summary</b>");
  });

  it("returns no offer when the DRC search is empty", async () => {
    // Real response of 2026-11-14.
    const ctx = fixtureContext([{ match: `${API}/jobs`, file: "weir/jobs-empty.json" }]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
    expect(ctx.requests).toHaveLength(1);
  });

  it("rejects Congo-Brazzaville, Gabon and unposted offers, keeps a DRC secondary site", async () => {
    // Hand-made details shaped like the real Solwezi one (job-R0038483.json);
    // the Congo-Brazzaville and Gabon country ids are placeholders.
    const detail = (id: string, info: object) => ({
      jobPostingInfo: { id, title: `Offer ${id}`, startDate: "2026-11-02", ...info },
    });
    const ctx = fixtureContext([
      {
        match: `${API}/jobs`,
        body: {
          total: 4,
          jobPostings: ["Pointe-Noire", "Solwezi", "Kolwezi", "Moanda"].map((city, n) => ({
            title: `Offer ${n}`,
            externalPath: `/job/${city}/Offer_R00${n}`,
          })),
        },
      },
      {
        match: `${API}/job/Pointe-Noire/`,
        body: detail("R000", {
          jobReqId: "R000",
          location: "Pointe-Noire",
          country: { descriptor: "Congo", id: "db69c20e446c11de98360015c5e6daf6" },
        }),
      },
      {
        // Primary site in Zambia, second site in the DRC.
        match: `${API}/job/Solwezi/`,
        body: detail("R001", {
          jobReqId: "R001",
          location: "Solwezi",
          additionalLocations: ["Lubumbashi"],
          country: { descriptor: "Zambia", id: "db69e9b8446c11de98360015c5e6daf6" },
        }),
      },
      {
        match: `${API}/job/Kolwezi/`,
        body: detail("R002", {
          jobReqId: "R002",
          location: "Kolwezi",
          posted: false,
          country: { descriptor: "Congo, Democratic Republic of the", id: "db69c26c446c11de98360015c5e6daf6" },
        }),
      },
      {
        // Moanda is also a DRC town: the known country (Gabon) wins.
        match: `${API}/job/Moanda/`,
        body: detail("R003", {
          jobReqId: "R003",
          location: "Moanda",
          country: { descriptor: "Gabon", id: "db69c4b2446c11de98360015c5e6daf6" },
        }),
      },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs.map((job) => job.externalId)).toEqual(["R001"]);
    expect(result.jobs[0]).toMatchObject({ location: "Lubumbashi", city: "Lubumbashi" });
  });

  it("pages through the search, whose total is only given on the first page", async () => {
    const posting = (n: number) => ({
      title: `Offer ${n}`,
      externalPath: `/job/Solwezi/Offer-${n}_R00${n}`,
      locationsText: "Solwezi",
    });
    const ctx = fixtureContext([
      {
        match: `${API}/jobs`,
        when: (options) => searchOffset(options) === 0,
        body: { total: 21, jobPostings: Array.from({ length: 20 }, (_, n) => posting(n)) },
      },
      {
        match: `${API}/jobs`,
        when: (options) => searchOffset(options) === 20,
        body: { total: 0, jobPostings: [posting(20)] },
      },
      // Every detail is the (real) Zambian one: all are filtered out.
      { match: `${API}/job/Solwezi/`, file: "weir/job-R0038483.json" },
    ]);

    const result = await runSource(source, { http: ctx.http, log: () => {} });

    expect(result.error).toBeUndefined();
    expect(result.jobs).toEqual([]);
    expect(ctx.requests.filter((url) => url.endsWith("/jobs"))).toHaveLength(2);
    expect(ctx.requests).toHaveLength(2 + 21);
  });
});
