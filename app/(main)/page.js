export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Bem-vindo ao Nosso Site</h1>
      <p className="text-lg mb-8">
        Soluções profissionais para impulsionar seu negócio digital.
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        <ServiceCard 
          title="Desenvolvimento Web"
          description="Sites modernos e responsivos"
        />
        <ServiceCard 
          title="Consultoria"
          description="Estratégias digitais personalizadas"
        />
        <ServiceCard 
          title="Marketing"
          description="Aumente sua visibilidade online"
        />
      </div>
    </div>
  )
}

function ServiceCard({ title, description }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
