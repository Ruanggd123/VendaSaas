import { BotEditor } from './editor'
import { getTenantId } from '@/lib/auth'

export default function BotsPage() {
  const tenantId = getTenantId()
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configuração do Chatbot</h3>
        <p className="text-sm text-muted-foreground">
          Personalize o atendimento automático do seu negócio
        </p>
      </div>

      <BotEditor tenantId={tenantId} />
    </div>
  )
}
