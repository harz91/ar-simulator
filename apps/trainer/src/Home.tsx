import { Link } from 'react-router-dom'

function Home() {
  return (
    <div>
      <h1>Trainer Home</h1>
      <Link to="/train/demo-project">Train Demo Project</Link>
    </div>
  )
}

export default Home