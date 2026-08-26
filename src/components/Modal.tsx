"use client";

import { Sheet } from "@/components/Sheet";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/** Desktop-centered dialog. On mobile it renders as a bottom sheet — see `Sheet`. */
export function Modal(props: ModalProps) {
  return <Sheet {...props} />;
}
