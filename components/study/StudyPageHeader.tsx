"use client";

type StudyPageHeaderProps = {
  onBack: () => void;
};

export default function StudyPageHeader({ onBack }: StudyPageHeaderProps) {
  return (
    <div className="header">
      <div className="header-top">
        <div className="menu" onClick={onBack}>
          ←
        </div>

        <div className="header-text">
          <div className="title">Study</div>
          <div className="subtitle">Review your cards</div>
        </div>

        <div style={{ width: "24px" }} />
      </div>
    </div>
  );
}
