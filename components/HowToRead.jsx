import React from "react";
import { howToReadFor } from "@/lib/howToRead";

export default function HowToRead({ of }) {
  const text = howToReadFor(of);
  if (!text) return null;
  return <p className="how-to-read">{text}</p>;
}
