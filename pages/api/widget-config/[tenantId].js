import { getTenantConfig } from '../../../lib/tenant';

export default async function handler(req, res) {
    const { tenantId } = req.query;
    
    try {
        const config = await getTenantConfig(tenantId);
        
        if (!config) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        const script = `
            window.whatsappConfig = ${JSON.stringify(config)};
            (function() {
                var script = document.createElement('script');
                script.src = '${process.env.NEXT_PUBLIC_WIDGET_URL || '/whatsapp-widget.js'}';
                document.body.appendChild(script);
            })();
        `;

        res.setHeader('Content-Type', 'application/javascript');
        res.send(script);
    } catch (error) {
        console.error('Error generating widget config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
