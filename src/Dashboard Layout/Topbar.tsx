import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../hooks/useRedux'
import { logoutUser } from '../store/slices/authSlice'

interface TopbarProps {
  sidebarCollapsed?: boolean
}

const Topbar = ({ sidebarCollapsed = false }: TopbarProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [showProfile, setShowProfile] = useState(false)



  const handleSignOut = () => {
    dispatch(logoutUser()).then(() => {
      navigate('/login');
    });
  }

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-300 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          {/* <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search patients, appointments, records..."
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-2 border-transparent rounded-xl outline-none transition-all duration-300 focus:bg-white focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 placeholder:text-slate-400"
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-slate-400 bg-slate-200 rounded-md">
                ⌘K
              </kbd>
            </div>
          </div> */}
          <span className="text-lg font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Dr Help
            </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 ml-4">
          {/* Quick Actions */}
          <button className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-linear-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New OPD</span>
          </button>


          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile)
              }}
              className="flex items-center gap-3 cursor-pointer p-1.5 pr-3 hover:bg-slate-100 rounded-xl transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/20">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-700">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400">{user?.role?.replace('_', ' ') || 'Staff'}</p>
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-800">{user?.name || 'User'}</p>
                  <p className="text-sm text-slate-400">{user?.email || ''}</p>
                </div>
                {/* <div className="py-2">
                  <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </a>
                </div> */}
                <div className="py-2 border-t border-slate-100">
                  <button onClick={handleSignOut} className="flex items-center gap-3 cursor-pointer w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar