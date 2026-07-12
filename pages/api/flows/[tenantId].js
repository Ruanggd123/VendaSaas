import { getTenantConfig, saveTenantConfig } from '../../../lib/tenant';

export default async function handler(req, res) {
  const { tenantId } = req.query;

  try {
    if (req.method === 'GET') {
      const config = await getTenantConfig(tenantId);
      if (!config) return res.status(404).json({ error: 'Tenant not found' });
      return res.json(config.flows);
    }

    if (req.method === 'POST') {
      const { flows } = req.body;
      await saveTenantConfig(tenantId, { flows });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Flow editor error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
