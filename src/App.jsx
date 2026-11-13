import { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation, Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import TripRequest from './pages/TripRequest.jsx';
import BookingStatus from './pages/BookingStatus.jsx';
import { About, Contact, Login } from './pages/Info.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PageBackground from './components/PageBackground.jsx';

function PublicLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const el = hash && document.querySelector(hash);
    if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (<>
    <a className="skip" href="#main">Skip to content</a>
    <Navbar />
    <main id="main"><Outlet /></main>
    <Footer />
  </>);
}

const NotFound = () => (
  <div className="wrap page"><h1>Page not found</h1><p className="lead">Check the address or go back <Link to="/">home</Link>.</p></div>
);

export default function App() {
  return (<>
    <PageBackground />
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="request" element={<TripRequest />} />
        <Route path="status" element={<BookingStatus />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="owner" element={<Dashboard />} />
    </Routes>
  </>);
}
