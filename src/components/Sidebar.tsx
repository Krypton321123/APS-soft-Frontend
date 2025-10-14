import React, { useState } from 'react'
import { FaBook, FaFileImage, FaMoneyBillWave, FaUser } from 'react-icons/fa'
import { FiSidebar, FiMenu } from "react-icons/fi";
import { useNavigate, useLocation } from 'react-router-dom';
import { IoMdExit } from "react-icons/io";
import { CiBadgeDollar, CiLocationArrow1 } from 'react-icons/ci'
import { motion } from 'motion/react'

function Sidebar({ children }: {children: React.ReactNode}) {

    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const sidebarContent = [
        { name: 'Orders', icon: <FaBook />, color: 'text-blue-600', path: '/orders' },
        { name: 'Collections', icon: <FaMoneyBillWave />, color: 'text-green-600', path: '/collections' },
        {name: 'Attendance', icon: <FaUser />, color: 'text-red-600', path: '/attendance'},
        {name: 'Daily Working', icon: <FaFileImage />, color: 'text-purple-600', path: '/images'},
        { name: 'Rate List', icon: <CiBadgeDollar />, color: 'text-gray-700', path: '/ratelist' }, 
        {name: 'Route Maps', icon: <CiLocationArrow1 />, color: 'text-slate-600', path: '/location'}
    ].map(item => ({
        ...item,
        isActive: location.pathname.startsWith(item.path)
    }))

  

  return (
    <div className='w-screen h-screen flex bg-gray-50'>
        {/* Sidebar */}
        <motion.div initial={{width: '3.5rem'}} whileHover={{width: '12rem'}} onHoverStart={() => {setIsOpen(true)}} onHoverEnd={() => setIsOpen(false)} transition={{duration: 0.2, ease:'linear'}} className={` justify-between flex-col flex bg-white shadow-xl border-r border-gray-200 relative`}>
            {/* Header */}
            <div>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className={`flex items-center gap-3 overflow-hidden`}>
                    { <div className={`w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                        <span className='text-white font-bold text-sm'>A</span>
                    </div>}
                    
                </div>
                
            </div>

            {/* Navigation */}
            <nav className='mt-8 px-4'>
                <div className='space-y-2'>
                    {sidebarContent.map((item, index) => (
                        <div onClick={() => {navigate(item.path)}}>
                            <motion.p layout className={`text-lg flex items-center gap-2 justfiy-center hover:bg-gray-200 rounded-lg w-full h-8 ${isOpen ? 'p-1' : 'p-1'} cursor-pointer`}>{item.icon} {isOpen && <p className='text-sm whitespace-nowrap'>{item.name}</p>}</motion.p>
                        </div>
                    ))}
                </div>
            </nav>
            </div>

            <div className='logout flex justify-center items-center mb-14 h-20'>
               <button onClick={() => {
                localStorage.removeItem('username')
                navigate('/')
               }} className={`text-xl hover:opacity-65 duration-200 active:opacity-20 border-2 flex items-center gap-3 border-black bg-gray-100 cursor-pointer rounded-4xl py-2`}> <p className={`px-2`}><IoMdExit /></p></button>
            </div>

        

            {/* Subtle gradient overlay */}
            <div className='absolute inset-0 bg-gradient-to-r from-transparent to-black/5 pointer-events-none'></div>
        </motion.div>

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
                <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 ${(location.pathname === '/images' || location.pathname === "/orders") ? 'h-screen' : 'h-full'} overflow-auto`}>
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