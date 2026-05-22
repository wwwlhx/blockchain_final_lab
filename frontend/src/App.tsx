import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { WalletProvider } from './contexts/WalletContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import Query from './pages/Query'
import Verify from './pages/Verify'
import Transfer from './pages/Transfer'
import History from './pages/History'
import Architecture from './pages/Architecture'

function App() {
  return (
    <WalletProvider>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/register" element={<Register />} />
            <Route path="/query" element={<Query />} />
            <Route path="/query/:id" element={<Query />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:id" element={<Verify />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/transfer/:id" element={<Transfer />} />
            <Route path="/history/:id" element={<History />} />
            <Route path="/architecture" element={<Architecture />} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </WalletProvider>
  )
}

export default App
