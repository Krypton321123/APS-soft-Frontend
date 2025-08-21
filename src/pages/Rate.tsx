import { useEffect, useState } from "react"
import axios from 'axios'



function Rate() {

    const [date, setDate] = useState<string | null>(null)
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState<boolean>(false)

    const [editedValues, setEditedValues] = useState<Record<string, {
        consumerRate: number, bulkRate: number
    }>>({})

    const handleEditValues = (untcd: string, rate: number, type: string) => {
        setEditedValues(prev => ({
            ...prev, 
            [untcd]: {
                ...prev[untcd], 
                [type]: rate
            }
        }))
    }

    const handleSave = async () => {
        if (Object.keys(editedValues).length <= 0) {
            return alert('Please edit some values before submitting')
        }

        console.log(editedValues); 

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/submitRates`, {date, submittedValues: editedValues})

        if (response.data.statusCode === 200) {
            alert("Data submitted successfully")
            return setDate(prev => prev)
            
        }
    }

    useEffect(() => {
        if (!data || !Array.isArray(data.rates)) return;

        setEditedValues(prev => {
            // If already filled (user started editing), don't overwrite
            if (Object.keys(prev).length > 0) return prev;

            const init = Object.fromEntries(
            data.rates.map((item: any) => [
                item.untcd,
                {
                consumerRate: item.consumerRate,
                bulkRate: item.bulkRate,
                },
            ])
            );

            return init;
        });
    }, [data]);

    useEffect(() => {

        if (!date) return;

        console.log("running here")

        const getDepotData = async () => {
            try {
            setLoading(true)

                setEditedValues({})

                const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/getRate`, {date})

                if (response.data.statusCode === 200) {
                    setData(response.data.data); 
                }

            } catch (err) {

                console.log("fetching data error: ", err)


            } finally {
                console.log(data)
                setLoading(false)
            }
        }
        
        getDepotData()

    }, [date])

  return (
    <div className='w-full flex flex-col'>
        <div className={`w-full h-16 ${data === null && "mb-10"} flex gap-10`}>
            <div className="w-48 h-15">
                <p className="whitespace-nowrap font-semibold text-lg">Select a date to load ratelist</p>
                <input onChange={(e: any) => { setDate(e.target.value) }} type='date' defaultValue={Date.now()} className="border-1 mt-3 border-gray-300 p-2 rounded-lg" />
            </div>
        </div>
        {data !== null && <div className='w-full h-full'>
  
            <table className='mt-10 h-full w-full border-separate border-spacing-0 rounded-2xl border-[1px] border-gray-200' style={{ maxHeight: "1000px" }}>
                <thead className=''>
                    <tr className='h-15 bg-gray-100 text-gray-500 text-sm uppercase font-medium tracking-wider'>
                        <th className=' border-b-2 border-gray-200'>
                            Depot Name
                        </th>
                        <th className=' border-b-2 border-gray-200'>
                            Consumer Rate
                        </th>
                        <th className=' border-b-2 border-gray-200'>
                            Bulk Rate
                        </th>
                        
                    </tr>
                </thead>
                <tbody className="h-20  ">
                    {data.depots.map((item: {untcd: string, untnm: string}, index: number) => {

                        console.log(Array.isArray(data.rates) && data.rates.length !== 0)
                        console.log(`WHAT MATTERS: ${'UNTA00008' === item.untcd}`)

                        return <tr key={index} className="w-full">
                            <td className="text-center">{item.untnm}</td>
                            <td className="flex justify-center items-center">
                                <input value={editedValues[item.untcd]?.consumerRate ?? 0} onChange={(e: any) => {handleEditValues(item.untcd, Number(e.target.value), 'consumerRate')}} type="number" className="w-30 mt-1 h-7 rounded-lg border-2 border-gray-300 text-right p-2 active:outline-0 focus:outline-0"/>
                            </td>
                            <td className="ml-4">
                                <div className="justify-center flex mb-1">
                                    <input value={editedValues[item.untcd]?.bulkRate ?? 0} onChange={(e: any) => {handleEditValues(item.untcd, Number(e.target.value), 'bulkRate')}} type="number" className="w-30 mt-1 h-7 rounded-lg border-2 border-gray-300 text-right p-2 active:outline-0 focus:outline-0"/>
                                </div>
                            </td>
                        </tr>
                    })}
                </tbody>
            </table>

            {<div className="w-full py-4 mt-2 flex justify-end items-center">
                    <button onClick={handleSave} className="px-15 mr-15 py-2 cursor-pointer bg-blue-500 text-white rounded-xl border-1 transition-opacity duration-100 active:opacity-80 border-blue-200 hover:opacity-90">
                        Save Rates
                    </button>
            </div>}

        </div>}
        {loading && <div className="w-full h-80 flex justify-center items-center">
                loading...
            </div>}
    </div>
  )
}

export default Rate