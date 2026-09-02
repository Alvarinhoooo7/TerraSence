import { useNavigate } from "react-router-dom"

export default function NotFound() {

    const navigate = useNavigate();
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-6xl text-red-600 font-bold">404</h1>
        <h2 className="text-3xl mt-4 mb-6 text-gray-600">Page Not Found</h2>
        <p className="text-lg text-gray-500">{'We\'re sorry, but the page you were looking for could not be found.'}</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-10 py-2 px-6 text-white bg-blue-500 hover:bg-blue-600 rounded transition duration-200 ease-in-out"
        >
          Go Back
        </button>
      </div>
    )
  }