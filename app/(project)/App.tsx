"use client";

import { useEffect } from "react";
import Navbar from "@/app/(project)/(components)/NavBar";
import MobileNotificationPanel from "@/app/(project)/(components)/MobileNotificationPanel";
import MobileDock from "@/app/(project)/(components)/MobileDock";
import MobileAppDrawer from "@/app/(project)/(components)/MobileAppDrawer";
import MobileHomeFloat from "@/app/(project)/(components)/MobileHomeFloat";
import MobileOnboardingHints from "@/app/(project)/(components)/MobileOnboardingHints";
import Welcome from "@/app/(project)/(components)/Welcome";
import Dock from "@/app/(project)/(components)/Dock";
import Home from "@/app/(project)/(components)/Home";
import useLocationStore from "@/app/(project)/(store)/location";
import { Terminal, Safari, Resume, Finder, Text, Image, Contact, PdfFile } from "@/app/(project)/(windows)";
import type { Location } from "@/app/(project)/(types)/location.types";
import type {
  BlogPost,
  ContactContent,
  MusicTrack,
  ResumeContent,
  TechStackCategory,
  WelcomeContent,
} from "@/app/(project)/(types)/other.types";

type AppProps = {
  locationsData: Record<string, Location>;
  blogPostsData?: BlogPost[];
  techStackData?: TechStackCategory[];
  musicTracksData?: MusicTrack[];
  contactContent?: ContactContent;
  resumeContent?: ResumeContent;
  welcomeContent?: WelcomeContent;
};

const App = ({
  locationsData,
  blogPostsData = [],
  techStackData = [],
  musicTracksData = [],
  contactContent,
  resumeContent,
  welcomeContent,
}: AppProps) => {
  const { activeLocation, setActiveLocation } = useLocationStore();

  useEffect(() => {
    const defaultLocation =
      locationsData.work ?? Object.values(locationsData)[0] ?? null;

    if (!activeLocation && defaultLocation) {
      setActiveLocation(defaultLocation);
    }
  }, [activeLocation, locationsData, setActiveLocation]);

  return (
    <main>
      <Navbar />
      <MobileNotificationPanel musicTracks={musicTracksData} />
      <Welcome content={welcomeContent} />
      <MobileDock />
      <MobileAppDrawer locationsData={locationsData} />
      <MobileHomeFloat />
      <MobileOnboardingHints />
      <Dock />

      <Terminal techStackData={techStackData} />
      <Safari blogPosts={blogPostsData} />
      <Resume resumeContent={resumeContent} />
      <PdfFile />
      <Finder locationsData={locationsData} />
      <Text />
      <Image />
      <Contact contactContent={contactContent} />
      <Home locationsData={locationsData} />
    </main>
  );
};

export default App;
