import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { applyProviderCatalog } from '@/lib/provider-config';

export function useProviderCatalogBootstrap() {
  const query = useQuery({
    queryKey: ['providers-catalog'],
    queryFn: () => api.providers.catalog(),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.data?.providers) {
      applyProviderCatalog(query.data.providers);
    }
  }, [query.data?.providers]);

  return query;
}
