import { useWindowStore } from "@/app/(project)/(store)/window";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import gsap from "gsap";
import type { ComponentType, PropsWithChildren, TouchEvent } from "react";
import type { WindowState, WindowKey } from "@/app/(project)/(types)/windows.types";
import type { WindowStore } from "@/app/(project)/(store)/window";
import useIsMobile from "@/app/(project)/(hooks)/useIsMobile";
import { dockApps } from "@/app/(project)/(content)/other.content";

type DraggableInstance = {
  kill: () => void;
  disable: () => void;
  enable: () => void;
};

const EDGE_GESTURE_MIN = 32;
const EDGE_GESTURE_MAX = 88;

const getEdgeGestureWidth = (viewportWidth: number) =>
  Math.min(EDGE_GESTURE_MAX, Math.max(EDGE_GESTURE_MIN, Math.round(viewportWidth * 0.18)));

const DOCK_WINDOW_ORDER = dockApps
  .filter((app) => app.canOpen)
  .map((app) => app.id as WindowKey);

/* ---------- HOC ---------- */

const WindowWrapper = <P extends object>(
  Component: ComponentType<P>,
  windowKey: WindowKey
) => {
  const Wrapped = (props: PropsWithChildren<P>) => {
    const { focusWindow, openWindow, closeWindow, windows } = useWindowStore() as WindowStore;

    const windowState: WindowState = windows[windowKey];

    const isOpen = windowState?.isOpen ?? false;
    const isMaximized = windowState?.isMaximized ?? false;
    const zIndex = windowState?.zIndex ?? 0;
    const isMobile = useIsMobile();

    const ref = useRef<HTMLElement | null>(null);
    const dragInstance = useRef<DraggableInstance | null>(null);
    const swipeStart = useRef<{
      x: number;
      y: number;
      fromHeader: boolean;
      startedInZoomedContent: boolean;
      startedAtEdge: boolean;
    } | null>(null);

    // ✅ Per-window drag memory
    const lastPosition = useRef({ x: 0, y: 0 });

    /* ---------- DRAGGABLE ---------- */
    useGSAP(() => {
      const el = ref.current;
      if (!isOpen || !el || typeof window === "undefined" || isMobile) return;

      let instance: DraggableInstance | null = null;

      const init = async () => {
        const { Draggable } = await import("gsap/Draggable");
        gsap.registerPlugin(Draggable);
        const dragHandle = el.querySelector<HTMLElement>("#window-header") ?? el;

        const draggables = Draggable.create(el, {
          trigger: dragHandle,
          cursor: "grab",
          activeCursor: "grabbing",
          onPress: () => focusWindow(windowKey),
          bounds: window,

          onDragEnd: function () {
            lastPosition.current = {
              x: this.x,
              y: this.y
            };
          }
        });

        instance = (draggables[0] as DraggableInstance) ?? null;
        dragInstance.current = instance;
      };

      void init();

      return () => {
        instance?.kill();
        dragInstance.current = null;
      };
    }, [isOpen, isMobile]);

    /* ---------- ENABLE / DISABLE DRAG ---------- */
    useGSAP(() => {
      if (!dragInstance.current || isMobile) return;

      if (isMaximized) {
        dragInstance.current.disable();
      } else {
        dragInstance.current.enable();
      }
    }, [isMaximized, isMobile]);

    /* ---------- RESET POSITION ON MAXIMIZE ---------- */
    useGSAP(() => {
      const el = ref.current;
      if (!el || !isMaximized || isMobile) return;

      gsap.set(el, {
        x: 0,
        y: 0,
        clearProps: "transform"
      });
    }, [isMaximized, isMobile]);

    /* ---------- RESTORE POSITION ON MINIMIZE ---------- */
    useGSAP(() => {
      const el = ref.current;
      if (!el || isMaximized || isMobile) return;

      const { x, y } = lastPosition.current;

      gsap.set(el, {
        x,
        y
      });
    }, [isMaximized, isMobile]);

    /* ---------- OPEN ANIMATION (UNCHANGED) ---------- */
    useGSAP(() => {
      const el = ref.current;
      if (!el || !isOpen) return;

      el.style.display = "block";

      gsap.fromTo(
        el,
        { scale: 0.8, opacity: 0, y: 40 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power3.out"
        }
      );
    }, [isOpen]);

    if (!isOpen) return null;

    const switchWindowBySwipe = (direction: "left" | "right") => {
      const currentIndex = DOCK_WINDOW_ORDER.indexOf(windowKey);
      if (currentIndex === -1 || DOCK_WINDOW_ORDER.length === 0) return;

      const step = direction === "left" ? 1 : -1;
      const nextIndex =
        (currentIndex + step + DOCK_WINDOW_ORDER.length) % DOCK_WINDOW_ORDER.length;
      const targetKey = DOCK_WINDOW_ORDER[nextIndex];

      const targetWindow = useWindowStore.getState().windows[targetKey];
      if (!targetWindow) return;

      if (targetWindow.isOpen) {
        focusWindow(targetKey);
      } else {
        openWindow(targetKey);
      }
    };

    const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
      if (!isMobile) return;
      if (event.changedTouches.length === 0) return;

      const target = event.target as HTMLElement | null;
      const fromHeader = Boolean(target?.closest("#window-header"));
      const startedInZoomedContent = Boolean(
        target?.closest('[data-mobile-zoomed="1"]')
      );

      const touch = event.changedTouches[0];
      const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
      const edgeWidth = getEdgeGestureWidth(viewportWidth);
      const startedAtEdge =
        touch.clientX <= edgeWidth ||
        touch.clientX >= viewportWidth - edgeWidth;
      const startedInRightHalf = viewportWidth > 0 ? touch.clientX >= viewportWidth * 0.5 : false;
      swipeStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        fromHeader,
        startedInZoomedContent,
        startedAtEdge,
        startedInRightHalf
      };
    };

    const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
      if (!isMobile || !swipeStart.current) return;
      if (event.changedTouches.length === 0) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - swipeStart.current.x;
      const deltaY = swipeStart.current.y - touch.clientY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const fromHeader = swipeStart.current.fromHeader;
      const startedInZoomedContent = swipeStart.current.startedInZoomedContent;
      const startedAtEdge = swipeStart.current.startedAtEdge;
      const startedInRightHalf = swipeStart.current.startedInRightHalf;

      swipeStart.current = null;

      if (startedInZoomedContent) {
        return;
      }

      const isLeftSwipe = deltaX < 0;
      if (!startedAtEdge && startedInRightHalf && isLeftSwipe && absX > 90 && absX > absY * 1.2) {
        const clearDockFocus = () => {
          const dockButtons = document.querySelectorAll<HTMLButtonElement>("#dock .dock-icon");
          dockButtons.forEach((button) => button.blur());
        };

        clearDockFocus();
        requestAnimationFrame(clearDockFocus);
        window.setTimeout(clearDockFocus, 80);

        const direction = deltaX < 0 ? "left" : "right";
        window.dispatchEvent(
          new CustomEvent("mobile-window-swiped", {
            detail: { direction },
          })
        );
        switchWindowBySwipe(direction);
        return;
      }

      if (fromHeader && deltaY > 90 && absX < 80) {
        closeWindow(windowKey);
      }
    };

    return (
      <section
        id={windowKey}
        ref={ref}
        style={{ zIndex }}
        className={
          isMobile
            ? "fixed mobile-window-shell"
            : `absolute ${isMaximized ? "window-maximized" : ""}`
        }
        onPointerDown={() => focusWindow(windowKey)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Component {...props} />
      </section>
    );
  };

  Wrapped.displayName = `WindowWrapper(${
    Component.displayName || Component.name || "Component"
  })`;

  return Wrapped;
};

export default WindowWrapper;
