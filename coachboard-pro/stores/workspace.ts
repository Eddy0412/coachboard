import { create } from "zustand";

interface WorkspaceState {
  selectedTimestampId: string | null;
  drawEnabled: boolean;
  selectedColor: string;
  selectedSize: number;
  overlayVisible: boolean;
  playerReady: boolean;
  currentTime: number;
  status: string;

  setSelectedTimestamp: (id: string | null) => void;
  setDrawEnabled: (enabled: boolean) => void;
  toggleDraw: () => void;
  setSelectedColor: (color: string) => void;
  setSelectedSize: (size: number) => void;
  setOverlayVisible: (visible: boolean) => void;
  setPlayerReady: (ready: boolean) => void;
  setCurrentTime: (time: number) => void;
  setStatus: (msg: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedTimestampId: null,
  drawEnabled: false,
  selectedColor: "#00E5FF",
  selectedSize: 4,
  overlayVisible: true,
  playerReady: false,
  currentTime: 0,
  status: "Idle.",

  setSelectedTimestamp: (id) => set({ selectedTimestampId: id }),
  setDrawEnabled: (enabled) => set({ drawEnabled: enabled }),
  toggleDraw: () => set((s) => ({ drawEnabled: !s.drawEnabled })),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setSelectedSize: (size) => set({ selectedSize: size }),
  setOverlayVisible: (visible) => set({ overlayVisible: visible }),
  setPlayerReady: (ready) => set({ playerReady: ready }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setStatus: (msg) => set({ status: msg }),
}));
