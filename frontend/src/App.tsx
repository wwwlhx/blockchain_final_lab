import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { WalletProvider } from './contexts/WalletContext'
import Layout from './components/Layout'
import { LoadingPanel } from './components/PageUI'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Register = lazy(() => import('./pages/Register'))
const Query = lazy(() => import('./pages/Query'))
const Verify = lazy(() => import('./pages/Verify'))
const Transfer = lazy(() => import('./pages/Transfer'))
const History = lazy(() => import('./pages/History'))
const Architecture = lazy(() => import('./pages/Architecture'))
const Certificate = lazy(() => import('./pages/Certificate'))

function App() {
  return (
    <WalletProvider>
      <Layout>
        <Suspense fallback={<LoadingPanel label="正在加载页面模块..." />}>
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
              <Route path="/certificate/:id" element={<Certificate />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Layout>
    </WalletProvider>
  )
}

export default App
