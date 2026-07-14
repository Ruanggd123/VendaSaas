import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'

export default function Home() {
  return (
    <>
      <Navbar />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center py-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Bem-vindo ao Nosso Site
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Uma solução incrível desenvolvida com as melhores tecnologias modernas.
        </p>
        <button className="btn-primary">
          Começar Agora
        </button>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {['Desempenho', 'Segurança', 'Experiência'].map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl"
            >
              <h3 className="text-xl font-semibold mb-3">{feature}</h3>
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
