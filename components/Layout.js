import Head from 'next/head'
import { Inter } from 'next/font/google'
import { motion } from 'framer-motion'

const inter = Inter({ subsets: ['latin'] })

export default function Layout({ children, title = 'Meu Site Profissional' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Um site profissional e moderno" />
      </Head>
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={inter.className}
      >
        <div className="container">
          {children}
        </div>
      </motion.main>
    </>
  )
}
