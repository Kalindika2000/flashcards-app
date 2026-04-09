"use client";

import React from "react";
import { useRouter } from "next/navigation";

type BottomNavProps = {
  onAdd?: () => void;
  showAdd?: boolean;
};

//const BottomNav: React.FC<BottomNavProps> = ({ onAdd }) => {
//export default function BottomNav({ onAdd }: BottomNavProps) {
  export default function BottomNav({ onAdd, showAdd = true }: BottomNavProps) {
  const router = useRouter();
  console.log("onAdd is:", onAdd);
  //const router = useRouter();

  return (
    <div
      className="bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60px",
        background: "#fff",
        borderTop: "1px solid #ddd",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 99999,
        pointerEvents: "auto",
      }}
    >
      {/* HOME */}
      <div
  onClick={() => router.push("/")}
  style={{ textAlign: "center", cursor: "pointer" }}
>
  Home
</div>

      {/* ADD */}
     
{showAdd && (
  <div
    onClick={onAdd}
    style={{ textAlign: "center", cursor: "pointer" }}
  >
    Add
  </div>
)}
    </div>
  );
};

