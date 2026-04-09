/**
 * Catalog Export Routes - Public model catalog export endpoint
 *
 * Proxies to CLIProxyAPIPlus /v1/models then enhances response with metadata.
 * GET /api/cliproxy/catalog/export?format=json&provider=geminicli
 */

import { Router, Request, Response } from 'express';
import { fetchCliproxyModels } from '../../cliproxy/stats-fetcher';
import { getResolvedCatalogSnapshot } from '../../cliproxy/catalog-cache';

const router = Router();

/** Exported model entry */
interface CatalogExportModel {
  id: string;
  provider: string;
  aliases: string[];
  capabilities: string[];
  thinking: boolean;
  max_tokens: number | null;
}

/** Catalog export response */
interface CatalogExportResponse {
  models: CatalogExportModel[];
  exported_at: string;
  base_url: string;
}

/** Map owned_by to normalized provider name */
function normalizeProvider(ownedBy: string): string {
  const lower = ownedBy.toLowerCase();
  if (lower.includes('gemini') || lower === 'geminicli') return 'geminicli';
  if (lower.includes('claude') || lower === 'anthropic') return 'claude';
  if (lower.includes('codex') || lower === 'openai') return 'codex';
  if (lower.includes('copilot') || lower === 'ghcp') return 'ghcp';
  if (lower.includes('qwen')) return 'qwen';
  if (lower.includes('kimi')) return 'kimi';
  if (lower.includes('iflow')) return 'iflow';
  if (lower.includes('kiro')) return 'kiro';
  return ownedBy;
}

/** Infer capabilities from model id */
function inferCapabilities(modelId: string): string[] {
  const id = modelId.toLowerCase();
  const caps: string[] = ['text'];
  if (
    id.includes('vision') ||
    id.includes('image') ||
    id.includes('flash') ||
    id.includes('pro') ||
    id.includes('claude') ||
    id.includes('gpt-4') ||
    id.includes('o1') ||
    id.includes('o3')
  ) {
    caps.push('image');
  }
  return caps;
}

/**
 * GET /export - Export model catalog as JSON
 */
router.get('/export', async (req: Request, res: Response): Promise<void> => {
  const providerFilter = typeof req.query.provider === 'string' ? req.query.provider : null;

  try {
    // Fetch live models from CLIProxyAPIPlus /v1/models endpoint
    const modelsResponse = await fetchCliproxyModels();
    // Fetch catalog snapshot for additional metadata (thinking, max_tokens)
    const snapshot = await getResolvedCatalogSnapshot();

    const baseUrl =
      process.env.CCS_BASE_URL ||
      `${req.protocol}://${req.get('host')?.replace(/:\d+$/, '') ?? 'localhost'}/v1`;

    // Build lookup map for catalog metadata
    const catalogMetaMap = new Map<string, { thinking: boolean; maxTokens: number | null }>();
    for (const [, providerCatalog] of Object.entries(snapshot.catalogs)) {
      if (!providerCatalog) continue;
      for (const model of providerCatalog.models) {
        const hasThinking = model.thinking !== undefined && model.thinking.type !== 'none';
        const maxTokens =
          'max' in (model.thinking ?? {})
            ? ((model.thinking as { max?: number }).max ?? null)
            : null;
        catalogMetaMap.set(model.id.toLowerCase(), {
          thinking: hasThinking,
          maxTokens,
        });
      }
    }

    let rawModels = modelsResponse?.models ?? [];

    // Apply provider filter if requested
    if (providerFilter) {
      const normalizedFilter = normalizeProvider(providerFilter);
      rawModels = rawModels.filter((m) => normalizeProvider(m.owned_by) === normalizedFilter);
    }

    const models: CatalogExportModel[] = rawModels.map((m) => {
      const meta = catalogMetaMap.get(m.id.toLowerCase());
      return {
        id: m.id,
        provider: normalizeProvider(m.owned_by),
        aliases: [],
        capabilities: inferCapabilities(m.id),
        thinking: meta?.thinking ?? false,
        max_tokens: meta?.maxTokens ?? null,
      };
    });

    const response: CatalogExportResponse = {
      models,
      exported_at: new Date().toISOString(),
      base_url: baseUrl,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
