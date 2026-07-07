import Nav from './Nav.jsx';
import Footer from './Footer.jsx';
import AnnouncementBar from './AnnouncementBar.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-base text-primary">
      <AnnouncementBar />
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
