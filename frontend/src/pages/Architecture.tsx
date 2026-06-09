import { motion } from 'framer-motion'
import { 
  Database, Server, Globe, FileCode, Shield, 
  ArrowDown, ArrowRight, Layers, HardDrive, Cpu, Monitor, Sparkles, CheckCircle2
} from 'lucide-react'
import { PageHeader, SectionTitle } from '../components/PageUI'

const techStack = [
  { name: 'Solidity', desc: '智能合约', color: 'text-purple-400' },
  { name: 'Hardhat', desc: '开发框架', color: 'text-yellow-400' },
  { name: 'ethers.js', desc: '链交互', color: 'text-blue-400' },
  { name: 'Express', desc: '后端API', color: 'text-green-400' },
  { name: 'SQLite', desc: '链下存储', color: 'text-cyan-400' },
  { name: 'React', desc: '前端框架', color: 'text-sky-400' },
  { name: 'TailwindCSS', desc: 'UI样式', color: 'text-teal-400' },
  { name: 'MetaMask', desc: '钱包连接', color: 'text-orange-400' },
]

const layers = [
  {
    title: '前端展示层',
    icon: Monitor,
    color: 'from-sky-500 to-blue-600',
    border: 'border-sky-500/30',
    items: ['React 18 + TypeScript', 'TailwindCSS 暗色主题', 'MetaMask 钱包集成', 'Framer Motion 动画'],
  },
  {
    title: '后端服务层',
    icon: Server,
    color: 'from-green-500 to-emerald-600',
    border: 'border-green-500/30',
    items: ['Express.js REST API', 'Controller → Service → DAO', '文件处理 & 哈希计算', 'SQLite 链下索引'],
  },
  {
    title: '区块链层',
    icon: Layers,
    color: 'from-purple-500 to-pink-600',
    border: 'border-purple-500/30',
    items: ['Solidity 智能合约', 'EVM 不可篡改存储', '事件驱动历史追溯', '权属状态机管理'],
  },
]

const dataFlow = [
  { step: '1', title: '文件上传', desc: '用户选择文件，前端上传至后端', icon: FileCode },
  { step: '2', title: '哈希计算', desc: 'SHA-256 算法计算文件唯一指纹', icon: Shield },
  { step: '3', title: '元数据生成', desc: '标准化 JSON 元数据并计算哈希', icon: Database },
  { step: '4', title: '链上登记', desc: '调用智能合约写入不可篡改记录', icon: Globe },
  { step: '5', title: '索引存储', desc: 'SQLite 存储链下索引加速查询', icon: HardDrive },
  { step: '6', title: '确权完成', desc: '资产获得唯一 ID 和链上证明', icon: Cpu },
]

export default function Architecture() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="System blueprint"
        title="可信资产平台架构"
        description="前端负责交互展示，后端处理文件和链下索引，智能合约保存不可篡改的核心确权记录。"
      />

      <motion.div
        className="hero-surface relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Sparkles className="absolute right-8 top-8 h-20 w-20 text-blockchain-accent/[0.06]" />
        <div className="relative grid gap-5 md:grid-cols-3">
          {[
            { value: '3', label: '层结构化确权模型' },
            { value: '6', label: '步可信数据流程' },
            { value: '8', label: '项核心技术能力' },
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-black/15 p-5">
              <p className="text-3xl font-bold gradient-text">{item.value}</p>
              <p className="mt-2 text-sm text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Architecture Layers */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SectionTitle title="分层架构" description="职责清晰的前端、服务和区块链三层系统" />
        <div className="space-y-4">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.title}
              className={`relative p-5 rounded-xl bg-blockchain-dark/60 border ${layer.border} overflow-hidden`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${layer.color}`} />
              <div className="flex items-start gap-4 ml-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <layer.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base">{layer.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {layer.items.map(item => (
                      <span key={item} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-gray-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {i < layers.length - 1 && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                  <ArrowDown className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Data Flow */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <SectionTitle title="数据流转过程" description="从本地文件到链上证据的完整生成路径" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {dataFlow.map((item, i) => (
            <motion.div
              key={item.step}
              className="relative flex flex-col items-center text-center p-4 rounded-xl bg-blockchain-dark/40 border border-white/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <div className="w-8 h-8 rounded-lg bg-blockchain-accent/15 flex items-center justify-center mb-2">
                <item.icon className="w-4 h-4 text-blockchain-accent" />
              </div>
              <p className="text-xs font-semibold text-white">{item.title}</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-tight">{item.desc}</p>
              {i < dataFlow.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600 hidden lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tech Stack */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <SectionTitle title="技术栈" description="围绕可运行、可测试、可展示选择的工程组件" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {techStack.map((tech, i) => (
            <motion.div
              key={tech.name}
              className="p-3 rounded-xl bg-blockchain-dark/40 border border-white/5 flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              whileHover={{ scale: 1.03 }}
            >
              <span className={`text-lg font-bold ${tech.color}`}>⬢</span>
              <div>
                <p className="font-medium text-sm">{tech.name}</p>
                <p className="text-[10px] text-gray-500">{tech.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Security Model */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <SectionTitle title="安全模型" description="系统能够提供的三类技术保障" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: '文件完整性', desc: '任何 1 bit 修改都会导致 SHA-256 哈希完全不同，确保文件内容不可伪造', color: 'text-blue-400' },
            { title: '声明防篡改', desc: '元数据规范化后哈希上链，确保权利声明与登记时完全一致', color: 'text-purple-400' },
            { title: '权属不可逆', desc: '智能合约状态机管理权属变更，历史记录不可篡改、可追溯', color: 'text-orange-400' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="p-4 rounded-xl bg-blockchain-dark/40 border border-white/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <h3 className={`flex items-center gap-2 font-semibold text-sm ${item.color} mb-2`}><CheckCircle2 className="h-4 w-4" />{item.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
