import { Router, Request, Response } from 'express';
import * as providerCapabilities from '../../cliproxy/provider-capabilities';

const router = Router();

router.get('/catalog', (_req: Request, res: Response): void => {
  try {
    const providers = [...providerCapabilities.CLIPROXY_PROVIDER_IDS]
      .sort((left, right) => left.localeCompare(right))
      .map((providerId) => {
        const capabilities = providerCapabilities.getProviderCapabilities(providerId);
        return {
          id: providerId,
          displayName: capabilities.displayName,
          oauthFlow: capabilities.oauthFlow,
          aliases: [...capabilities.aliases],
          logoAssetPath: capabilities.logoAssetPath,
          features: {
            supportsQuota: capabilities.features.supportsQuota,
            requiresNickname: capabilities.features.requiresNickname,
            supportsImageAnalysis: capabilities.features.supportsImageAnalysis,
          },
        };
      });

    res.json({
      version: 1,
      providers,
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to load provider catalog' });
  }
});

export default router;
