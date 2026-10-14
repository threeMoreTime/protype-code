import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Article from './pages/Article';
import About from './pages/About';
export default function App() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/article" element={<Article />} />
    <Route path="/about" element={<About />} />
  </Routes>;
}
