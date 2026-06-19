import { useEffect, useState } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './App.css'
import AdminPortal from './pages/AdminPortal'
import ShopApp from './pages/ShopApp'

function currentPath() {
  return window.location.pathname === '/admin' ? '/admin' : '/'
}

function App() {
  const [path, setPath] = useState(currentPath())

  useEffect(() => {
    const onPopState = () => setPath(currentPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function navigate(nextPath) {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0f766e',
          borderRadius: 8,
          colorBgLayout: '#f5f7fb',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <AntApp>
        {path === '/admin' ? <AdminPortal navigate={navigate} /> : <ShopApp navigate={navigate} />}
      </AntApp>
    </ConfigProvider>
  )
}

export default App
