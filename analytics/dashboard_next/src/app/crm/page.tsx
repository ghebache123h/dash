import { getDashboardData, getFilterOptions, parseFilters } from "@/lib/analytics";
import { CrmClient } from "./CrmClient";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CrmPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = (await Promise.resolve(searchParams ?? {})) as SearchParams;
  const options = await getFilterOptions();
  const filters = parseFilters(resolvedParams, options.channels, options.categories);
  const data = await getDashboardData(filters);

  return (
    <CrmClient
      data={data}
      filters={filters}
      channels={options.channels}
      categories={options.categories}
    />
  );
}
