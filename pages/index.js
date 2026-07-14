import Layout from '../components/Layout'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <Layout title="Bem-vindo ao Meu Site">
      <motion.section
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="py-20 text-center"
      >
        <h1 className="text-4xl font-bold mb-4">
          Transforme suas ideias em realidade
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Soluções profissionais para impulsionar seu negócio
        </p>
        <a href="#services" className="btn">
          Conheça nossos serviços
        </a>
      </motion.section>

      <section id="services" className="py-20">
        <h2 className="text-3xl font-bold mb-8 text-center">Nossos Serviços</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <ServiceCard 
            title="Desenvolvimento Web" 
            description="Criação de sites modernos e responsivos"
          />
          <ServiceCard 
            title="Consultoria Digital" 
            description="Estratégias para crescimento online"
          />
          <ServiceCard 
            title="Otimização SEO" 
            description="Melhore seu posicionamento nos buscadores"
          />
        </div>
      </section>
    </Layout>
  )
}

function ServiceCard({ title, description }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-white p-6 rounded-lg shadow-lg"
    >
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  )
}
