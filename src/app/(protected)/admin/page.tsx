import { Card } from '../../../components/Card'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Usuários" value="1,234" />
        <Card title="Visitas" value="5,678" />
        <Card title="Receita" value="R$ 12,345" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Atividade Recente</h2>
        {/* Tabela ou lista de atividades */}
      </div>
    </div>
  )
}
