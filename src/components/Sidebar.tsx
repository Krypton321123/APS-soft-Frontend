import React, { useState } from 'react'
import { FaBook, FaFileImage, FaMoneyBillWave, FaUser } from 'react-icons/fa'
import { FiSidebar, FiMenu } from "react-icons/fi";
import { useNavigate, useLocation } from 'react-router-dom';
import { IoMdExit } from "react-icons/io";
import { CiBadgeDollar } from 'react-icons/ci'

function Sidebar({ children }: {children: React.ReactNode}) {

    const [isOpen, setIsOpen] = useState(true)
    const navigate = useNavigate()
    const location = useLocation()

    const sidebarContent = [
        { name: 'Orders', icon: <FaBook />, color: 'text-blue-600', path: '/orders' },
        { name: 'Collections', icon: <FaMoneyBillWave />, color: 'text-green-600', path: '/collections' },
        {name: 'Attendance', icon: <FaUser />, color: 'text-red-600', path: '/attendance'},
        {name: 'Employee Daily Working', icon: <FaFileImage />, color: 'text-purple-600', path: '/images'},
        { name: 'Rate List', icon: <CiBadgeDollar />, color: 'text-gray-700', path: '/ratelist' }
    ].map(item => ({
        ...item,
        isActive: location.pathname.startsWith(item.path)
    }))

  

  return (
    <div className='w-screen h-screen flex bg-gray-50'>
        {/* Sidebar */}
        <div className={`${isOpen ? 'w-72' : 'w-20'} justify-between flex-col flex transition-all duration-300 ease-in-out bg-white shadow-xl border-r border-gray-200 relative`}>
            {/* Header */}
            <div>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className={`flex items-center gap-3 ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 overflow-hidden`}>
                    <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
                        <span className='text-white font-bold text-sm'>A</span>
                    </div>
                    {isOpen && <h1 className='text-gray-800 font-bold text-xl whitespace-nowrap'>APS Dashboard</h1>}
                </div>
                <button 
                    className='p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0'
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <FiSidebar size={20}/> : <FiMenu size={20}/>}
                </button>
            </div>

            {/* Navigation */}
            <nav className='mt-8 px-4'>
                <div className='space-y-2'>
                    {sidebarContent.map((item, index) => (
                        <div 
                            key={item.name}
                            onClick={() => {
                                navigate(item.path)
                            }}
                            className={`flex items-center h-14 gap-4 p-3 rounded-xl cursor-pointer group transition-all duration-200 hover:translate-x-1 relative ${
                                !isOpen ? 'justify-center' : ''
                            } ${
                                item.isActive 
                                    ? 'bg-blue-100 border-2 border-blue-200 shadow-sm' 
                                    : 'hover:bg-blue-50'
                            }`}
                            style={{
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            {/* Active indicator line */}
                            {item.isActive && (
                                <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full"></div>
                            )}
                            
                            <div className={`${
                                item.isActive ? 'text-blue-700' : item.color
                            } group-hover:scale-110 ml-4 transition-transform duration-200`}>
                                {React.cloneElement(item.icon, { size: 20 })}
                            </div>
                            <span className={`font-medium transition-colors duration-200 ${
                                item.isActive 
                                    ? 'text-blue-800 font-semibold' 
                                    : 'text-gray-700 group-hover:text-blue-600'
                            } ${isOpen ? 'opacity-100' : 'opacity-0 w-0'} transition-all duration-300`}>
                                {item.name}
                            </span>
                            
                            {/* Tooltip for collapsed state */}
                            {!isOpen && (
                                <div className='absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50'>
                                    {item.name}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </nav>
            </div>

            <div className='logout flex justify-center items-center mb-14 h-20'>
               <button onClick={() => {
                localStorage.removeItem('username')
                navigate('/')
               }} className={`text-xl hover:opacity-65 transition-opacity duration-200 active:opacity-20 border-2 flex items-center gap-3 border-black bg-gray-100 cursor-pointer ${isOpen ? 'px-10' : 'px-0 w-12 justify-center'} rounded-4xl py-2`}> <p className={`${isOpen ? '' : 'absolute translate-x-0 duration-1000'}`}><IoMdExit /></p>  <p className={`${isOpen ? 'opacity-100' : 'opacity-0'}`}>Logout</p></button>
            </div>

        

            {/* Subtle gradient overlay */}
            <div className='absolute inset-0 bg-gradient-to-r from-transparent to-black/5 pointer-events-none'></div>
        </div>

        {/* Main Content */}
        <div className='flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden'>
            {/* Background pattern */}
            <div className='absolute inset-0 opacity-5'>
                <div className='absolute inset-0' style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)',
                    backgroundSize: '20px 20px'
                }}></div>
            </div>
            
            {/* Content */}
            <div className='relative z-10 p-8'>
                <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 ${(location.pathname === '/images' || location.pathname === "/collections" || location.pathname === "/orders") ? 'h-screen' : 'h-full'} overflow-auto`}>
                    {children || (
                        <div className='flex items-center justify-center h-full'>
                            <div className='text-center'>
                                <div className='w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                                    <FaBook className='text-white' size={24} />
                                </div>
                                <h2 className='text-2xl font-bold text-gray-800 mb-2'>Welcome to APS Dashboard</h2>
                                <p className='text-gray-600'>Click on Orders to get started</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}

export default Sidebar