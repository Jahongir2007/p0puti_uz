import { useState, useCallback } from "react";
import Home from "./pages/home.page";
import Search from "./pages/search.page";
import CreateAd from "./pages/createAd.page";
import Profile from "./pages/profile.page";
import Navbar from "./components/navbar.component";
import { AuthGate } from "./components/authGate.component";
import AdPage from "./pages/ad.page";
import UserAdsPage from "./pages/userAds.page";

function App() {
    const [activeSection, setActiveSection] = useState("home");
    const [adId, setAdId] = useState(null);

    // navigate("ad", "123") or navigate("search")
    const navigate = useCallback((section, id = null) => {
      // alert(`section: ${section}\nid: ${id}`);
      setActiveSection(section);
      setAdId(id);
    }, []);
     return (
      <AuthGate>
        <div>
          {activeSection === "home" && <Home onNavigate={navigate} />}
          {activeSection === "search" && <Search onNavigate={navigate}/>}
          {activeSection === "create" && <CreateAd />}
          {activeSection === "profile" && <Profile onNavigate={navigate} />}
          {activeSection === "ad" && <AdPage adId={adId} onNavigate={navigate} />}
          {activeSection === "userAds" && <UserAdsPage onNavigate={navigate}/>}

          {/* <Navbar
            activeSection={activeSection}
            onSectionChange={navigate}
          /> */}
          {activeSection !== "ad" && (
            <Navbar activeSection={activeSection} onSectionChange={navigate} />
          )}
        </div>
      </AuthGate>
    );
}

export default App;