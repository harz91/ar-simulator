import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { TrainerView } from './components/TrainerView'
import './index.css'

function App() {
    const [firebaseInitialized, setFirebaseInitialized] = useState(false)

    useEffect(() => {
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
        }

        try {
            initializeApp(firebaseConfig)
            getAuth()
            setFirebaseInitialized(true)
        } catch (error) {
            console.error('Firebase initialization error:', error)
        }
    }, [])

    return (
        <Router>
            <Routes>
                <Route path="/train/:projectId" element={<TrainerView />} />
                <Route
                    path="/"
                    element={
                        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
                            <h1>AR Simulator - Trainer</h1>
                            <p>
                                Firebase Status:{' '}
                                {firebaseInitialized ? '✓ Initialized' : '✗ Not initialized'}
                            </p>
                            <p>
                                Navigate to <code>/train/:projectId</code> to start training.
                            </p>
                        </div>
                    }
                />
            </Routes>
        </Router>
    )
}

export default App
