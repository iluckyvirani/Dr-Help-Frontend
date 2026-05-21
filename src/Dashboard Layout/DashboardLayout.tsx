import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const DashboardLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Topbar */}
      <Topbar sidebarCollapsed={sidebarCollapsed} />

      {/* Main Content */}
      <main
        className={`pt-15 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="p-6">
          {/* Page Content */}
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout