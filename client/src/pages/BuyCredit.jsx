import React from 'react'
import { assets, plans } from '../assets/assets'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router'
import { useAuth } from '@clerk/clerk-react'
import { toast } from 'react-toastify'
import axios from 'axios'

const BuyCredit = () => {

  const {backendUrl, loadCreditsData} = useContext(AppContext)
  const navigate = useNavigate();
  const {getToken} = useAuth()

  const initPay = async (order) => {
   try {
    // Check if Razorpay is loaded
      if (!window.Razorpay) {
        toast.error('Payment system not loaded. Please refresh the page.');
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: order.amount,
        currency: order.currency,
        name: 'Credits Payment',
        description: "Credits Payment",
        order_id: order.id,
        receipt: order.receipt,
        handler: async (response) => {
          console.log('Payment response:', response);
          const token = await  getToken();
          try {
            const {data} = await axios.post(backendUrl+'/api/user/verify-razor', response, {headers:{token}})
            if (data.success){
              loadCreditsData()
              navigate('/')
              toast.success("Credits Added")
            }
          } catch (error) {
            console.log(error)
            toast.error(error.message)
          }
      }}
      const rzp = new window.Razorpay(options);
      rzp.open();
    
   } catch (error) {
    console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment');
   }
  }
    
  const paymentRazorpay = async (planId) => {
    try {
      console.log('Starting payment for plan:', planId); // Debug log
      
      // Show loading state
      toast.info('Initializing payment...');
      
      const token = await getToken();
      console.log('Token obtained:', !!token); // Debug log
      
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      const {data} = await axios.post(
        backendUrl + '/api/user/pay-razor', 
        {planId}, 
        {headers: {token}}
      );
      
      console.log('Backend response:', data); // Debug log
      
      if (data.success) {
        await initPay(data.order);
      } else {
        toast.error(data.message || 'Failed to create payment order');
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      // Better error handling
      if (error.response) {
        toast.error(error.response.data?.message || 'Payment failed');
      } else if (error.request) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.message || 'Something went wrong');
      }
    }
  }

  // Debug function to test button click
  const handlePurchaseClick = (planId) => {
    console.log('Purchase button clicked for plan:', planId);
    paymentRazorpay(planId);
  }

  return (
    <div className='min-h-[80vh] text-center pt-14 mb-30'>
      <button className='border border-gray-400 px-10 py-2 rounded-full mb-6'>Our Plans</button>
      <h1 className='text-center text-2xl md:text-3xl lg:text-4xl mt-4 font-semibold bg-gradient-to-r from-gray-900 to-gray-400 bg-clip-text text-transparent mb-6 sm:mb-10'>
        Choose the plan that's right for you
      </h1>
  
      
      <div className='flex flex-wrap justify-center gap-6 text-left'>
        {plans && plans.length > 0 ? (
          plans.map((item, index) => (
            <div key={index} className='bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-700 hover:scale-105 transition-all duration-500'>
              <img width={40} src={assets.logo_icon} alt="" />
              <p className='mt-3 font-semibold'>{item.id}</p>
              <p className='text-sm'>{item.desc}</p>
              <p className='mt-6'>
                <span className='text-3xl font-medium'>${item.price}</span>/ {item.credits} credits
              </p>
              <button 
                onClick={() => handlePurchaseClick(item.id)} 
                className='w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52 hover:bg-gray-700 transition-colors'
                disabled={!backendUrl} // Disable if no backend URL
              >
                {!backendUrl ? 'Configuration Error' : 'Purchase'}
              </button>
            </div>
          ))
        ) : (
          <div className='text-gray-500'>No plans available</div>
        )}
      </div>
    </div>
  )
}

export default BuyCredit