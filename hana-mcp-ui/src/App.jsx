
import { Toaster } from 'react-hot-toast'
import MainApp from './components/MainApp'

function App() {
  return (
    <>
      <MainApp />
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
          },
        }}
      />
    </>
  )
}

export default App