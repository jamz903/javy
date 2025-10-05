import { Route, Routes } from 'react-router'
import './App.css'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import Documentation from './pages/Documentation'
import Chat from './pages/Chat'
import About from './pages/About'
import Settings from './pages/Settings'
import History from './pages/History'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/history" element={<History />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/chat" element={<Chat />} />
      </Route>
    </Routes >
  )
}

export default App
