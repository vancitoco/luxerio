import Nav from './Nav.jsx';
import Footer from './Footer.jsx';
import GreenStrip from './GreenStrip.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-base text-primary">
      <Nav />
      <GreenStrip />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
