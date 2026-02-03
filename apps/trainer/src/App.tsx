import { Routes, Route } from "react-router-dom";
import TrainView from "./pages/TrainView";

const App = () => {
  return (
    <Routes>
      <Route path="/train/:projectId" element={<TrainView />} />
    </Routes>
  );
};

export default App;
