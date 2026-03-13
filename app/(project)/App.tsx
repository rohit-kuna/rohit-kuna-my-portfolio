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
import useIsMobile from "@/app/(project)/(hooks)/useIsMobile";
import useLocationStore from "@/app/(project)/(store)/location";
import { useWindowStore } from "@/app/(project)/(store)/window";
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
import type { WindowKey } from "@/app/(project)/(types)/windows.types";

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
  const isMobile = useIsMobile();
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const getWindowState = useWindowStore.getState;

  useEffect(() => {
    const defaultLocation =
      locationsData.work ?? Object.values(locationsData)[0] ?? null;

    if (!activeLocation && defaultLocation) {
      setActiveLocation(defaultLocation);
    }
  }, [activeLocation, locationsData, setActiveLocation]);

  useEffect(() => {
    if (!isMobile || typeof document === "undefined") return;
    document.documentElement.dataset.mobileFullscreenPromptResolved = "1";
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;

    const ensureHistoryState = () => {
      const state = window.history.state as { __mobileHomeLock?: boolean } | null;
      if (state?.__mobileHomeLock) return;
      window.history.pushState({ __mobileHomeLock: true }, "");
    };

    const getTopOpenWindowKey = (): WindowKey | null => {
      const windows = getWindowState().windows;
      let topKey: WindowKey | null = null;
      let topZ = -Infinity;

      (Object.keys(windows) as WindowKey[]).forEach((key) => {
        const win = windows[key];
        if (!win?.isOpen) return;
        const zIndex = win.zIndex ?? 0;
        if (zIndex >= topZ) {
          topZ = zIndex;
          topKey = key;
        }
      });

      return topKey;
    };

    const isNotificationOpen = () => {
      const panel = document.getElementById("mobile-notification-panel");
      return Boolean(panel?.classList.contains("is-open"));
    };

    const isAppDrawerOpen = () =>
      document.documentElement.classList.contains("mobile-app-drawer-open");

    ensureHistoryState();

    const onPopState = () => {
      if (isNotificationOpen()) {
        window.dispatchEvent(new Event("mobile-notification-close"));
        ensureHistoryState();
        return;
      }

      if (isAppDrawerOpen()) {
        window.dispatchEvent(new Event("mobile-app-drawer-close"));
        ensureHistoryState();
        return;
      }

      const topWindow = getTopOpenWindowKey();
      if (topWindow) {
        closeWindow(topWindow);
        ensureHistoryState();
        return;
      }

      // Already on home screen: keep the user in-app.
      ensureHistoryState();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isMobile, closeWindow, getWindowState]);

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
