import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { ProjectList } from './components/ProjectList'
import { CreateProjectForm } from './components/CreateProjectForm'
import { ProjectDetail } from './components/ProjectDetail'
import './App.css'

type AppView = 'list' | 'create' | 'detail'

function App() {
    const [firebaseInitialized, setFirebaseInitialized] = useState(false)
    const [currentView, setCurrentView] = useState<AppView>('list')
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

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

    const handleProjectSelect = (projectId: string) => {
        setSelectedProjectId(projectId)
        setCurrentView('detail')
    }

    const handleCreateClick = () => {
        setCurrentView('create')
    }

    const handleProjectCreated = () => {
        setRefreshKey(prev => prev + 1)
        setCurrentView('list')
    }

    const handleBackToList = () => {
        setCurrentView('list')
        setSelectedProjectId(null)
        setRefreshKey(prev => prev + 1)
    }

    if (!firebaseInitialized) {
        return (
            <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
                <h1>AR Simulator - Studio</h1>
                <p>Initializing Firebase...</p>
            </div>
        )
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>AR Simulator - Studio</h1>
            </header>

            <main className="app-main">
                {currentView === 'list' && (
                    <ProjectList
                        key={refreshKey}
                        onProjectSelect={handleProjectSelect}
                        onCreateClick={handleCreateClick}
                    />
                )}

                {currentView === 'create' && (
                    <CreateProjectForm
                        onProjectCreated={handleProjectCreated}
                        onCancel={handleBackToList}
                    />
                )}

                {currentView === 'detail' && selectedProjectId && (
                    <ProjectDetail
                        projectId={selectedProjectId}
                        onBack={handleBackToList}
                    />
                )}
            </main>
        </div>
    )
}

export default App
