"use client";

import { Sheet } from "@/components/Sheet";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/** Mobile rounded bottom sheet. On desktop it centers as a dialog — see `Sheet`. */
export function BottomSheet(props: BottomSheetProps) {
  return <Sheet {...props} />;
}
