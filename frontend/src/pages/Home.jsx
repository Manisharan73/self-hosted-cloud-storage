import React, { useState } from 'react';
import '../styles/Home.css';
import { 
  FiSearch, FiUpload, FiGrid, FiList 
} from 'react-icons/fi';
import Sidebar from '../components/Sidebar';

const Home = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      <main className="main-content">
        <div className="main-content-wrapper">
          <header className="dashboard-header">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input type="text" placeholder="Search your files..." />
            </div>
            <div className="header-actions">
              <button className="upload-btn"><FiUpload /> <span>Upload file</span></button>
            </div>
          </header>

          <section className="section-container">
            <div className="section-header">
              <h2>Recently opened</h2>
            </div>
            <div className="recent-grid">
              <div className="recent-card"><div className="folder-icon blue" /><span>Travel 2026</span></div>
              <div className="recent-card"><div className="file-doc" /><span>blog-artic.docx</span></div>
              <div className="recent-card"><div className="file-img-preview" /><span>travelDiaryItaly.jpg</span></div>
              <div className="recent-card"><div className="file-sheet" /><span>IRS-Returns-2026.xlsx</span></div>
            </div>
          </section>

          <section className="section-container">
            <div className="section-header">
              <h2>All files</h2>
            </div>
            <div className="files-grid">
              {['Simon\'s', 'Italy 2025', 'Artdocs', 'detailed_imgs', 'Crash file', 'Analysis dec'].map(file => (
                <div className="file-item" key={file}>
                  <div className="small-folder" />
                  <span>{file}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;