import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
export default function Home() {
  return <main><h1>社区故事</h1><p>记录街区生活，分享身边的发现。</p>
    <ul aria-label="最新文章"><li>周末市集指南</li><li>社区花园的一天</li></ul>
    <Link to="/article">阅读市集指南</Link><Link to="/about">关于我们</Link><Footer />
  </main>;
}
