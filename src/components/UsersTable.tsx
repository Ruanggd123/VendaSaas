'use client'

import { useState } from 'react'

interface User {
  id: string
  name: string | null
  email: string
  status: string
  role: string
  created_at: Date
}

export function UsersTable() {
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'João Silva', email: 'joao@exemplo.com', status: 'active' },
    { id: '2', name: 'Maria Souza', email: 'maria@exemplo.com', status: 'active' },
    { id: '3', name: 'Carlos Oliveira', email: 'carlos@exemplo.com', status: 'active' }
  ])
  const [confirmAction, setConfirmAction] = useState<{userId: string, action: 'suspend' | 'delete'} | null>(null)

  const handleSuspend = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'suspended' : 'active' } 
        : user
    ))
    setConfirmAction(null)
  }

  const handleDelete = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId))
    setConfirmAction(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.name || 'Não informado'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  user.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : user.status === 'suspended'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.status === 'active' ? 'Ativo' : 
                   user.status === 'suspended' ? 'Suspenso' : user.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap space-x-2">
                <button
                  onClick={() => setConfirmAction({userId: user.id, action: 'suspend'})}
                  className={`text-sm ${
                    user.status === 'active' 
                      ? 'text-yellow-600 hover:text-yellow-900' 
                      : 'text-green-600 hover:text-green-900'
                  }`}
                >
                  {user.status === 'active' ? 'Suspender' : 'Ativar'}
                </button>
                <button
                  onClick={() => setConfirmAction({userId: user.id, action: 'delete'})}
                  className="text-sm text-red-600 hover:text-red-900"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de confirmação */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              {confirmAction.action === 'suspend' 
                ? users.find(u => u.id === confirmAction.userId)?.status === 'active'
                  ? 'Suspender conta?'
                  : 'Ativar conta?'
                : 'Excluir conta permanentemente?'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction.action === 'suspend'
                ? `Tem certeza que deseja ${users.find(u => u.id === confirmAction.userId)?.status === 'active' ? 'suspender' : 'ativar'} esta conta?`
                : 'Esta ação não pode ser desfeita. Todos os dados serão perdidos.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmAction.action === 'suspend' 
                  ? handleSuspend(confirmAction.userId) 
                  : handleDelete(confirmAction.userId)}
                className={`px-4 py-2 rounded-md text-white ${
                  confirmAction.action === 'suspend' 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
