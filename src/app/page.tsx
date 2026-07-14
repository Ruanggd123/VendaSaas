import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'

const features = [
  {
    title: 'Desempenho',
    description: 'Aplicação otimizada para carregamento rápido e experiência fluida',
    icon: '⚡'
  },
  {
    title: 'Segurança',
    description: 'Protegemos seus dados com as melhores práticas de segurança',
    icon: '🔒'
  },
  {
    title: 'Experiência',
    description: 'Interface intuitiva e acessível para todos os usuários',
    icon: '✨'
  }
]

export default function Home() {
  return (
    <>
      <Navbar />
      
      <div className="space-y-20 pb-20">
        {/* Hero Section */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-10"></div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-20 px-4 relative z-10"
          >
            <motion.h1
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              Bem-vindo ao Nosso Site
            </motion.h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Uma solução incrível desenvolvida com as melhores tecnologias modernas.
            </p>
            <div className="flex justify-center gap-4">
              <button className="btn-primary">
                Começar Agora
              </button>
              <button className="btn-outline">
                Saiba Mais
              </button>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Nossos Diferenciais</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Descubra o que nos torna a melhor escolha para suas necessidades
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-indigo-50 py-16">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Pronto para começar?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Junte-se a milhares de usuários satisfeitos e experimente a diferença hoje mesmo.
            </p>
            <button className="btn-primary px-8 py-3 text-lg">
              Criar Conta Gratuita
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
