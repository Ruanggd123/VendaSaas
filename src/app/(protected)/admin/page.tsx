import { Card } from '../../../components/Card'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          title="Usuários" 
          value="1,234" 
          icon="👤"
          trend="+12%"
        />
        <Card 
          title="Visitas" 
          value="5,678" 
          icon="👣"
          trend="+8%"
        />
        <Card 
          title="Receita" 
          value="R$ 12,345" 
          icon="💰"
          trend="-3%"
        />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Atividade Recente</h2>
        <div className="space-y-4">
          {[
            { id: 1, user: 'João Silva', action: 'Criou novo projeto', time: '2h atrás' },
            { id: 2, user: 'Maria Souza', action: 'Atualizou perfil', time: '3h atrás' },
            { id: 3, user: 'Carlos Oliveira', action: 'Adicionou novo usuário', time: '5h atrás' }
          ].map(activity => (
            <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{activity.user}</p>
                <p className="text-sm text-gray-500">{activity.action}</p>
              </div>
              <p className="text-sm text-gray-400">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
